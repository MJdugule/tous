import mongoose from 'mongoose';

const userModel = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    gender: { type: String, enum: ['male', 'female'], required: true, lowercase: true, default: null },
    isVerified: { type: Boolean, default: false },
    verifiedAt: { type: Date, default: null },
    role: { type: String, required: true, trim: true, default: "USER" },

    age: { type: Number, min: 18, max: 100, default: null },
    location: { type: String, trim: true, default: null },
    aboutYou: { type: String, trim: true, maxlength: 500, default: null },

    // Screen 2: Interests
    interests: {
      type: [String],
      default: [],
    },

    // Screen 3: Relationship Goal
    relationshipGoal: {
      type: String,
      enum: [
        'A long-term relationship',
        'Something casual',
        "Let's see where it goes",
        'Meeting new people',
        null,
      ],
      default: null,
    },

    // Screen 4: Dating Preferences
    interestedIn: {
      type: [String],
      enum: ['Men', 'Women'],
      default: [],
    },
    preferredAgeRange: {
      type: [String],
      enum: ['18-25', '26-35', '36-45', '56-65', '66-75'],
      default: [],
    },

    // Screen 5: Languages & Habits
    languages: {
      type: [String],
      enum: ['English', 'German', 'French', 'Spanish', 'others'],
      default: [],
    },
    drinking: {
      type: String,
      enum: ['Never', 'Sometimes', 'Often', 'Prefer not to say', null],
      default: null,
    },
    smoking: {
      type: String,
      enum: ['Never', 'Sometimes', 'Often', 'Prefer not to say', null],
      default: null,
    },
    pets: {
      type: String,
      enum: ['Have pets', 'Love pets', 'No pets', 'Prefer not to say', null],
      default: null,
    },

    // Screen 6: Photos (4 required per design)
    photos: {
      type: [String],
      default: [],
    },

    // Auto-calculated completion flag
    isProfileComplete: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.model('User', userModel);
