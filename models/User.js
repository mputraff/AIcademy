import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true
    },
    profilePicture: {
        type: Buffer,
        default: null
    },
}, {
    timestamps: true 
});


export default mongoose.model("User", userSchema);