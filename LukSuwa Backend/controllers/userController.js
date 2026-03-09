import bcrypt from 'bcrypt';
// import OTP from '../models/otp.js';
import User from '../models/user.js';


export async function createUser(req, res) {

    try {
        
        const hashedPassword = await bcrypt.hashSync(req.body.password, 10);

        const user = new User({
            username : req.body.username,
            email : req.body.email,
            password : hashedPassword,
            gender: req.body.gender,
            age: req.body.age,
            phone: req.body.phone,
            role : req.body.role
            // is_verified : req.body.is_verified
        })

        await user.save()

        res.status(201).json({ 
            message: "User created successfully", user 
        });

    } catch (err) {
        res.status(500).json({
            message: "Error creating user", 
            error: err.message
        });
    }
}


export async function getUsers(req, res) {
    try {
        const users = await User.find();
        res.status(200).json(users);
    } catch (err) {
        res.status(500).json({
            message: "Error fetching users", 
            error: err.message
        });
    }
}




// export async function sendOTP(req, res) {
//     const randomOTP = Math.floor(100000 + Math.random() * 900000);
//     const email = req.body.email;

//     if (email == null) {
//         res.status(400).json({
//             message: "Email is required"
//         });
//         return
//     }
    

//     const user = await User.findOne({ email : email })

//     if (user == null) {
//         res.status(404).json({
//             message: "User not found"
//         });
//         return
//     }

//     await OTP.deleteMany({ email: email });

//     const message = {
//         from: "luksuwa@gmail.com",
//         to: email,
//         subject: "Your OTP Code",
//         html: `
//             <div style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 40px 20px;">
//                 <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); padding: 30px; text-align: center;">
//                     <h2 style="color: #4CAF50; margin-bottom: 20px;">OTP Code</h2>
//                     <p style="font-size: 16px; color: #555;">You requested to reset your password. Use the following OTP to complete the process:</p>
//                     <div style="font-size: 24px; font-weight: bold; margin: 20px auto; background-color: #f0f0f0; padding: 15px; border-radius: 8px; width: fit-content; color: #333;">
//                         ${randomOTP}
//                     </div>
//                     <p style="font-size: 14px; color: #888;">This OTP is valid for 10 minutes. If you did not request this, please ignore this email.</p>
//                 </div>
//             </div>
//         `
//     }

//     const otp  = new OTP({
//         email : email,
//         otp: randomOTP
//     })

//     await otp.save()

//     transport.sendMail(message , (error, infor) => {
//         if (error) {
//             res.status(500).json({
//                 message : "Internal server error",
//                 error : error
//             })
//         } else {
//             res.json({
//                 message : "OTP sent successfully"
//             })
//         }
//     })

// }