import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import mongoose from "mongoose";
import bcrypt from "bcrypt";

import { userSchema } from "./schemas";
import { seizureSchema } from "./schemas";
import { contactSchema } from "./schemas";
import { seizureTypeSchema } from "./schemas";
import { contactTypeSchema } from "./schemas";

import contactTypes from "./data/contact-types.json";
import seizureTypes from "./data/seizure-types.json";

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
const SeizureType = mongoose.model("SeizureType", seizureTypeSchema);
const ContactType = mongoose.model("ContactType", contactTypeSchema);

if (process.env.RESET_DATABASE) {
  const populateDatabase = async () => {
    await SeizureType.deleteMany();
    await ContactType.deleteMany();

    seizureTypes.forEach(async item => {
      const newSeizureType = new SeizureType(item);
      await newSeizureType.save();
    });

    contactTypes.forEach(async item => {
      const newContactType = new ContactType(item);
      await newContactType.save();
    });
  };
  populateDatabase();
};

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
const allowedDomains = ["https://epilepsy-app.netlify.app", "http://localhost:3000", "http://192.168.1.109:3000"];
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
      accessToken: user.accessToken,
      email: user.email,
      firstName: user.firstName,
      surname: user.surname,
      birthDate: user.birthDate,
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
    const seizures = await Seizure.find({ seizureUserId: user._id }).sort({ seizureDate: "desc" }).exec();
    const contacts = await Contact.find({ contactUserId: user._id }).sort({ updatedAt: "desc" }).exec();
    const allSeizureTypes = await SeizureType.find();
    const allContactTypes = await ContactType.find();
    res.status(200).json({
      userId: user._id,
      accessToken: user.accessToken,
      email: user.email,
      firstName: user.firstName,
      surname: user.surname,
      birthDate: user.birthDate,
      seizures: seizures,
      contacts: contacts,
      seizureTypes: allSeizureTypes,
      contactTypes: allContactTypes
    });
  } else {
    res.status(404).json({ notFound: true });
  };
});

// Get user data with authentication
app.get("/userdata", authenticateUser);
app.get("/userdata", async (req, res) => {
  if (req.header("userId") != req.user._id) {
    res.status(403).json({ error: "Access Denied" });
  } else {
    const seizures = await Seizure.find({ seizureUserId: req.user._id }).sort({ seizureDate: "desc" }).exec();
    const contacts = await Contact.find({ contactUserId: req.user._id }).sort({ updatedAt: "desc" }).exec();
    const allSeizureTypes = await SeizureType.find();
    const allContactTypes = await ContactType.find();
    res.status(200).json({
      userId: req.user._id,
      accessToken: req.user.accessToken,
      email: req.user.email,
      firstName: req.user.firstName,
      surname: req.user.surname,
      birthDate: req.user.birthDate,
      seizures: seizures,
      contacts: contacts,
      seizureTypes: allSeizureTypes,
      contactTypes: allContactTypes
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
        userId: user._id,
        accessToken: user.accessToken,
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

// Delete user and user data
app.delete("/userdata", authenticateUser);
app.delete("/userdata", async (req, res) => {
  if (req.header("userId") != req.user._id) {
    res.status(403).json({ error: "Access Denied" });
  } else {
    await User.deleteOne({ _id: req.user._id })
    await Seizure.deleteMany({ seizureUserId: req.user._id });
    await Contact.deleteMany({ contactUserId: req.user._id });
    res.status(200).json({ message: `All data related to user ${req.user._id} has been deleted` });
  };
});

// Retrieve all contacts
app.get("/contacts", authenticateUser);
app.get("/contacts", async (req, res) => {
  try {
    if (req.header("userId") != req.user._id) {
      res.status(403).json({ error: "Access Denied" });
    } else {
      const contacts = await Contact.find({ contactUserId: req.user._id }).sort({ updatedAt: "desc" }).exec();
      res.status(200).json(contacts);
    }
  } catch (err) {
    res.status(400).json({ message: "Could not retrieve contacts", errors: err })
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
      res.status(200).json(contact);
    }
  } catch (err) {
    res.status(400).json({ message: "Could not update contact", errors: err })
  };
});

// Delete contact
app.delete("/contacts", authenticateUser);
app.delete("/contacts", async (req, res) => {
  try {
    if (req.header("userId") != req.user._id) {
      res.status(403).json({ error: "Access Denied" });
    } else {
      const contact = await Contact.findOneAndDelete(
        { "_id": req.header("contactId") }
      );
      res.status(200).json(contact);
    }
  } catch (err) {
    res.status(400).json({ message: "Could not delete contact", errors: err })
  };
});

// Retrieve all seizures
app.get("/seizures", authenticateUser);
app.get("/seizures", async (req, res) => {
  try {
    if (req.header("userId") != req.user._id) {
      res.status(403).json({ error: "Access Denied" });
    } else {
      const seizures = await Seizure.find({ seizureUserId: req.user._id }).sort({ seizureDate: "desc" }).exec();
      res.status(200).json(seizures);
    }
  } catch (err) {
    res.status(400).json({ message: "Could not retrieve seizures", errors: err })
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

// Update seizure
app.patch("/seizures", authenticateUser);
app.patch("/seizures", async (req, res) => {
  try {
    if (req.header("userId") != req.user._id) {
      res.status(403).json({ error: "Access Denied" });
    } else {
      const queriedSeizure = await Seizure.findOne({ _id: req.header("seizureId") });
      const {
        seizureDate = queriedSeizure.seizureDate,
        seizureLength = queriedSeizure.seizureLength,
        seizureType = queriedSeizure.seizureType,
        seizureTrigger = queriedSeizure.seizureTrigger,
        seizureComment = queriedSeizure.seizureComment
      } = req.body;
      const seizure = await Seizure.findOneAndUpdate(
        { "_id": req.header("seizureId") },
        {
          $set: {
            seizureDate,
            seizureLength,
            seizureType,
            seizureTrigger,
            seizureComment
          }
        },
        { new: true, runValidators: true }
      );
      res.status(200).json(seizure);
    }
  } catch (err) {
    res.status(400).json({ message: "Could not update seizure", errors: err })
  };
});

// Delete seizure
app.delete("/seizures", authenticateUser);
app.delete("/seizures", async (req, res) => {
  try {
    if (req.header("userId") != req.user._id) {
      res.status(403).json({ error: "Access Denied" });
    } else {
      const seizure = await Seizure.findOneAndDelete(
        { "_id": req.header("seizureId") }
      );
      res.status(200).json(seizure);
    }
  } catch (err) {
    res.status(400).json({ message: "Could not delete seizure", errors: err })
  };
});

// Get contact types
app.get("/contacttypes", async (req, res) => {
  try {
    const allContactTypes = await ContactType.find();
    res.status(200).json(allContactTypes);
  } catch (err) {
    res.status(400).json({ message: "Could not find contact types", errors: err })
  };
});

// Get seizure types
app.get("/seizuretypes", async (req, res) => {
  try {
    const allSeizureTypes = await SeizureType.find();
    res.status(200).json(allSeizureTypes);
  } catch (err) {
    res.status(400).json({ message: "Could not find seizure types", errors: err })
  };
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
