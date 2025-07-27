import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Name is required"],
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: [true, "Password is required"],
    minlength: [6, "Password must be at least 6 characters"],
  },
  dob: String,
  gender: {
    type: String,
    enum: ["male", "female"],
    default: "male",
  },
  mobile: String,
  affiliatePhone: String,
  profileImage: String,
  cartItems: [
    {
      quantity: Number,
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    },
  ],
  role: {
    type: String,
    enum: ["admin", "customer"],
    default: "customer",
  },

}, {
  timestamps: true,
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

const User = mongoose.model("User", userSchema);
export default User;
