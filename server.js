import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import mongoose from "mongoose";
import bcrypt from "bcrypt";

import { userSchema } from "./schemas";
import { seizureSchema } from "./schemas";
import { contactSchema } from "./schemas";

const mongoUrl = process.env.MONGO_URL || "mongodb://localhost/epApp";
mongoose.connect(mongoUrl, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true, // To get rid of deprecation warning regarding collection.ensureIndex
  useFindAndModify: false // To get rid of deprecation warning regarding findOneAndUpdate()
});
mongoose.Promise = Promise;

userSchema.pre("save", async function (next) {
  const user = this;
  if (!user.isModified("password")) {
    return next();
  };
  const salt = bcrypt.genSaltSync();
  user.password = bcrypt.hashSync(user.password, salt);
  next();
});

const User = mongoose.model("User", userSchema);
const Seizure = mongoose.model("Seizure", seizureSchema);
const Contact = mongoose.model("Contact", contactSchema);

const authenticateUser = async (req, res, next) => {
  try {
    const user = await User.findOne({ accessToken: req.header("Authorization") });
    if (!user) {
      throw "User not found";
    }
    req.user = user;
    next();
  } catch (err) {
    const errorMessage = "Please try logging in again";
    res.status(401).json({ error: errorMessage });
  };
};

// Definition of the port the app will run on.
const port = process.env.PORT || 8080;
const app = express();
const listEndpoints = require("express-list-endpoints");

// Middlewares to enable cors and json body parsing
const allowedDomains = ["https://ep-app.netlify.app", "http://localhost:3000"];
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedDomains.indexOf(origin) === -1) {
      const msg = `Access denied for ${origin}. Only specific domains are allowed to access this API.`;
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  }
}));
app.use(bodyParser.json());

// Endpoints
app.get("/", (req, res) => {
  res.send({ title: "The Epilepsy App's API", endpoints: listEndpoints(app) });
});

// Create user
app.post("/users", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await new User({ email, password }).save();
    res.status(200).json({
      userId: user._id,
      accessToken: user.accessToken
    });
  } catch (err) {
    res.status(400).json({ message: "Could not create user", errors: err });
  };
});

// Login
app.post("/sessions", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (user && bcrypt.compareSync(password, user.password)) {
    res.status(200).json({
      userId: user._id,
      accessToken: user.accessToken
    });
  } else {
    res.status(404).json({ notFound: true });
  };
});

// Test endpoint
// app.get("/testing", authenticateUser);
app.get("/testing", async (req, res) => {
  res.send("Test endpoint");
});

// Get user info with authentication
app.get("/userdata", authenticateUser);
app.get("/userdata", async (req, res) => {
  if (req.header("userId") != req.user._id) {
    res.status(403).json({ error: "Access Denied" });
  } else {
    const seizures = await Seizure.find({ seizureUserId: req.user._id });
    const contacts = await Contact.find({ contactUserId: req.user._id });
    res.status(200).json({
      userId: req.user._id,
      email: req.user.email,
      firstName: req.user.firstName,
      surname: req.user.surname,
      birthDate: req.user.birthDate,
      seizures: seizures,
      contacts: contacts,
    });
  };
});

// Update user's profile
app.patch("/userdata", authenticateUser);
app.patch("/userdata", async (req, res) => {
  try {
    if (req.header("userId") != req.user._id) {
      res.status(403).json({ error: "Access Denied" });
    } else {
      const {
        email = req.user.email,
        firstName = req.user.firstName,
        surname = req.user.surname,
        birthDate = req.user.birthDate
      } = req.body;
      const user = await User.findOneAndUpdate(
        { "_id": req.user._id },
        {
          $set: {
            email,
            firstName,
            surname,
            birthDate
          }
        },
        { new: true, runValidators: true }
      );
      res.status(200).json({
        email: user.email,
        firstName: user.firstName,
        surname: user.surname,
        birthDate: user.birthDate
      });
    }
  } catch (err) {
    res.status(400).json({ message: "Could not update user", errors: err });
  };
});

// Register new contact
app.post("/contacts", authenticateUser);
app.post("/contacts", async (req, res) => {
  try {
    if (req.header("userId") != req.user._id) {
      res.status(403).json({ error: "Access Denied" });
    } else {
      const contactData = { contactUserId: req.user._id, ...req.body };
      const contact = await new Contact(contactData).save();
      res.status(200).json(contact);
    }
  } catch (err) {
    res.status(400).json({ message: "Could not create contact", errors: err })
  };
});

// Update contact
app.patch("/contacts", authenticateUser);
app.patch("/contacts", async (req, res) => {
  try {
    if (req.header("userId") != req.user._id) {
      res.status(403).json({ error: "Access Denied" });
    } else {
      const queriedContact = await Contact.findOne({ _id: req.header("contactId") });
      const {
        contactType = queriedContact.contactType,
        contactFirstName = queriedContact.contactFirstName,
        contactSurname = queriedContact.contactSurname,
        contactPhoneNumber = queriedContact.contactPhoneNumber,
        contactCategory = queriedContact.contactCategory
      } = req.body;
      const contact = await Contact.findOneAndUpdate(
        { "_id": req.header("contactId") },
        {
          $set: {
            contactType,
            contactFirstName,
            contactSurname,
            contactPhoneNumber,
            contactCategory
          }
        },
        { new: true, runValidators: true }
      );
      res.status(200).json({
        contactType: contact.contactType,
        contactFirstName: contact.contactFirstName,
        contactSurname: contact.contactSurname,
        contactPhoneNumber: contact.contactPhoneNumber,
        contactCategory: contact.contactCategory
      });
    }
  } catch (err) {
    res.status(400).json({ message: "Could not update contact", errors: err })
  };
});

// Register new seizure
app.post("/seizures", authenticateUser);
app.post("/seizures", async (req, res) => {
  try {
    if (req.header("userId") != req.user._id) {
      res.status(403).json({ error: "Access Denied" });
    } else {
      const seizureData = { seizureUserId: req.user._id, ...req.body };
      const seizure = await new Seizure(seizureData).save();
      res.status(200).json(seizure);
    }
  } catch (err) {
    res.status(400).json({ message: "Could not register seizure", errors: err })
  };
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
