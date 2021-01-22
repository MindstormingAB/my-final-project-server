import mongoose from "mongoose";
import crypto from "crypto";

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
  userId: {
    type: String,
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
}, { timestamps: true });

export const contactSchema = new mongoose.Schema({
  userId: {
    type: String,
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
}, { timestamps: true });