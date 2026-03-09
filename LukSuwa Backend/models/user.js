import mongoose from "mongoose";


const userSchema = mongoose.Schema({
    username : {
        type: String,
        required: true
    },
    email : {
        type: String,
        required: true,
        unique: true
    },
    password : {
        type: String,
        required: true
    },
    gender : {
        type: String,
        required: true
    },
    age : {
        type: Number,
        required: true
    },
    phone : {
        type: String,
        required: true
    },
    role : {
        type: String,
        required: true,
        default: "patient"
    }
    // is_verified : {
    //     type: Boolean,
    //     required: true,
    //     default: false
    // }
})

const User = mongoose.model("User", userSchema);

export default User;