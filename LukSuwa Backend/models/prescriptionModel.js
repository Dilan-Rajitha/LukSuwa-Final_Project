import mongoose from "mongoose";

const prescriptionSchema = new mongoose.Schema(
  {
    user: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true,
      index: true 
    },
    medicineName: { 
      type: String, 
      required: true,
      trim: true
    },
    strength: { 
      type: String, 
      required: true,
      trim: true
    },
    dosage: { 
      type: String, 
      required: true,
      trim: true
    },
    frequency: { 
      type: String, 
      required: true,
      trim: true
    }
  },
  { 
    timestamps: true 
  }
);

const Prescription = mongoose.model("Prescription", prescriptionSchema);

export default Prescription;


