import mongoose from "mongoose";

const otpSchema = mongoose.Schema({
    email : {
        type: String,
        required: true
    },
    otp: {
        type: Number,
        required: true
    }
})


const OTP = mongoose.model("OTP", otpSchema);

export default OTP;