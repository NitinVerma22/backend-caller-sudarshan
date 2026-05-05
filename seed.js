require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");
const Lead = require("./models/Lead");

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB for seeding...");

    // Clear existing data
    await User.deleteMany();
    await Lead.deleteMany();

    // Create Admin
    const admin = await User.create({
      name: "Admin User",
      email: "admin@example.com",
      password: "password123",
      role: "admin",
    });

    // Create Telecaller
    const telecaller = await User.create({
      name: "John Telecaller",
      email: "john@example.com",
      password: "password123",
      role: "telecaller",
    });

    console.log("Users created: admin@example.com / john@example.com (password: password123)");

    // Create some leads
    const leads = [
      { name: "Rajesh Kumar", phone: "9876543210", businessName: "Kumar Textiles", location: "Mumbai", status: "new", assignedTo: telecaller._id },
      { name: "Priya Sharma", phone: "9123456789", businessName: "Sharma Electronics", location: "Delhi", status: "new", assignedTo: telecaller._id },
      { name: "Anil Patel", phone: "9988776655", businessName: "Patel Pharma", location: "Ahmedabad", status: "interested", assignedTo: telecaller._id },
    ];

    await Lead.insertMany(leads);
    console.log("Sample leads created!");

    process.exit();
  } catch (error) {
    console.error("Error seeding data:", error);
    process.exit(1);
  }
};

seedData();
