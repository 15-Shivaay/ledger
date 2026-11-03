const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    description: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

const Setting = mongoose.model('Setting', settingSchema);

/**
 * Gets a setting value by key with a fallback
 */
Setting.getSetting = async function (key, defaultValue) {
  let doc = await this.findOne({ key });
  return doc ? doc.value : defaultValue;
};

/**
 * Sets a setting value by key
 */
Setting.setSetting = async function (key, value, description = '') {
  return this.findOneAndUpdate(
    { key },
    { key, value, description },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

module.exports = Setting;

