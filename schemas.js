import mongoose from "mongoose";
import crypto from "crypto";

import seizureTypes from "./data/seizure-types.json";
import contactTypes from "./data/contact-types.json";

const seizureNames = seizureTypes.map(type => type.name);
const contactNames = contactTypes.map(type => type.name);
const contactCategories = contactTypes.map(type => type.category);

export const userSchema = new mongoose.Schema({
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
  firstName: {
    type: String,
    default: "",
  },
  surname: {
    type: String,
    default: "",
  },
  birthDate: {
    type: Date,
    default: "",
  }
}, { timestamps: true });

export const seizureSchema = new mongoose.Schema({
  seizureUserId: {
    type: String,
  },
  seizureDate: {
    type: Date,
  },
  seizureLength: {
    hours: {
      type: Number,
    },
    minutes: {
      type: Number,
    },
    seconds: {
      type: Number,
    },
  },
  seizureType: {
    type: String,
    enum: seizureNames,
  },
  seizureTrigger: {
    type: String,
  },
  seizureComment: {
    type: String,
  }
}, { timestamps: true });

export const seizureTypeSchema = new mongoose.Schema({
  seizureName: {
    type: String
  },
  seizureDescription: {
    type: String
  }
})

export const contactSchema = new mongoose.Schema({
  contactUserId: {
    type: String,
  },
  contactType: {
    type: String,
    enum: contactNames,
  },
  contactFirstName: {
    type: String,
  },
  contactSurname: {
    type: String,
  },
  contactPhoneNumber: {
    type: String,
  },
  contactCategory: {
    type: String,
    enum: contactCategories,
  }
}, { timestamps: true });