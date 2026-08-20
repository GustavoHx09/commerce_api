import mongoose from "mongoose";

const tenantsSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },

    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },

    isActive: {
        type: Boolean,
        default: true,
    },
}, {
    timestamps: true,
});

export default mongoose.model('tenants', tenantsSchema);
