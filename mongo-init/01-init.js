db = db.getSiblingDB(process.env.MONGO_INITDB_DATABASE || "ai_dashboard");

db.createUser({
    user: "app_user",
    pwd: process.env.MONGO_APP_PASSWORD || "app_password",
    roles: [{ role: "readWrite", db: process.env.MONGO_INITDB_DATABASE || "ai_dashboard" }],
});

// Seed initial collections so Mongoose doesn't complain on first boot
db.createCollection("users");
db.createCollection("sessions");
db.createCollection("notifications");
db.createCollection("files");
db.createCollection("jobs");

print("MongoDB init complete — app_user created");