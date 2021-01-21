import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import mongoose from "mongoose";
import crypto from "crypto";
import bcrypt from "bcrypt";

const mongoUrl = process.env.MONGO_URL || "mongodb://localhost/EpApp";
mongoose.connect(mongoUrl, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true, // To get rid of deprecation warning regarding collection.ensureIndex
  // useFindAndModify: false // To get rid of deprecation warning regarding findOneAndUpdate()
});
mongoose.Promise = Promise;

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    minlength: 5,
  },
  password: {
    type: String,
    required: true,
    minlength: 5,
  },
  accessToken: {
    type: String,
    default: () => crypto.randomBytes(128).toString("hex"),
    unique: true,
  },
  profile: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Profile"
  },
  seizures: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Seizure"
    }
  ],
  contacts: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contact"
    }
  ]
});

const Profile = new mongoose.model("Profile", {
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  firstName: {
    type: String,
    default: "",
  },
  surname: {
    type: String,
    default: "",
  },
  birthDate: {
    type: Number,
    default: "",
  },
});

const Seizure = new mongoose.model("Seizure", {
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  date: {
    type: Date,
    default: Date.now, // https://stackoverflow.com/questions/55798779/store-only-time-in-mongodb
  },
  length: {
    type: Date,
  },
  seizureType: {
    type: String,
  },
  trigger: {
    type: String,
  },
  comment: {
    type: String,
  }
});

const Contact = new mongoose.model("Contact", {
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  contactType: {
    type: String,
  },
  contactFirstName: {
    type: String,
  },
  contactSurname: {
    type: String,
  },
  phoneNumber: {
    type: String,
  },
  relation: {
    type: String
  }
});

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

const authenticateUser = async (req, res, next) => {
  try {
    const user = await User.findOne({ accessToken: req.header("Authorization") });
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ loggedOut: true });
  }
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
      var msg = `Access denied for ${origin}. Only specific domains are allowed to access this API.`;
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
    res.status(200).json({ userId: user._id, accessToken: user.accessToken });
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

// Get user info with authentication
app.get("/userdata", authenticateUser);
app.get("/userdata", async (req, res) => {
  try {
    res.status(200).json({
      userId: req.user._id,
      email: req.user.email,
      profile: req.user.profile,
      seizures: req.user.seizures,
      contacts: req.user.contacts,
    });
  } catch (err) {
    res.status(403).json({ error: "Access Denied" });
  };
});

// Register new contact
app.post("/contacts", authenticateUser);
app.post("/contacts", async (req, res) => {
  try {
    const contactData = { userId: req.user._id, ...req.body };
    const contact = await new Contact(contactData).save();
    res.status(200).json(contact);
  } catch (err) {
    res.status(400).json({ message: "Could not create contact", errors: err })
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
