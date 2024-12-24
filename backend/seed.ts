import bcrypt from "bcryptjs";
import userModel, { IUser } from "./models/user.model";
import Jwt, { Secret } from "jsonwebtoken";
import { courseModel } from "./models/courses/course.model";
import { reviewModel } from "./models/courses/review.model";
import { commentModel } from "./models/courses/comment.model";
import { courseDataModel } from "./models/courses/coursedata.model";

// Dummy Course Data
const courseData = {
  "_id": "652efb3f814e1b00123acdbf",
  "name": "Full Stack Web Development",
  "description": "Learn how to build modern web applications using JavaScript, Node.js, and MongoDB.",
  "price": 199.99,
  "estimatedPrice": 250.00,
  "thumbnail": {
    "public_id": "fullstack_thumb_001",
    "url": "https://example.com/thumbnails/fullstack.jpg"
  },
  "tags": "JavaScript, Node.js, MongoDB",
  "level": "Intermediate",
  "categories": "Programming",
  "demoUrl": "https://example.com/demo/fullstack",
  "benefits": [
    { "title": "Hands-on projects" },
    { "title": "Lifetime access" }
  ],
  "prequesities": [
    { "title": "Basic programming knowledge" },
    { "title": "Familiarity with JavaScript" }
  ],
  "ratings": 4.5,
  "purchased": 1200,
  "createdAt": "2023-10-01T10:00:00Z",
  "updatedAt": "2023-10-01T10:00:00Z"
};

// Dummy Review Data
const reviewData = {
  "_id": "652f1b6a6f8e4b001c69c1a2",
  "user": "652eaca7c9f4f70012345678",  // Reference to User ObjectId
  "rating": 5,
  "comment": "This course is fantastic! It covers everything I needed to become a full stack developer.",
  "course": "652efb3f814e1b00123acdbf",  // Reference to the Course ObjectId
  "commentReplies": [],
  "createdAt": "2023-10-02T12:30:00Z",
  "updatedAt": "2023-10-02T12:30:00Z"
};

// Dummy Comment Data
const commentData = {
  "_id": "652f1b8f6f8e4b001c69c1a3",
  "user": "652eaca7c9f4f70012345679",  // Reference to User ObjectId
  "question": "How does this course cover backend development?",
  "questionReplies": [],
  "createdAt": "2023-10-02T12:35:00Z",
  "updatedAt": "2023-10-02T12:35:00Z"
};

// Dummy Course Data (course materials)
const courseMaterialData = {
  "_id": "652f1dbd6f8e4b001c69c1b4",
  "title": "Backend Development with Node.js",
  "description": "In this section, you'll learn how to build scalable backend services using Node.js and Express.",
  "videoUrl": "https://example.com/videos/backend-development",
  "videoThumbnail": {
    "public_id": "backend_video_thumb_001",
    "url": "https://example.com/thumbnails/backend-video.jpg"
  },
  "videoSection": "Backend Development",
  "videoLength": 5400,
  "videoPlayer": "HTML5",
  "links": [
    {
      "title": "Node.js Documentation",
      "url": "https://nodejs.org/docs"
    },
    {
      "title": "Express.js Guide",
      "url": "https://expressjs.com/en/guide"
    }
  ],
  "suggestion": "Complete the assignments after each section.",
  "questions": ["652f1b8f6f8e4b001c69c1a3"],  // Reference to Comment ObjectId
  "createdAt": "2023-10-02T13:00:00Z",
  "updatedAt": "2023-10-02T13:00:00Z"
};

// Dummy User Data
const dummyUser = {
  name: "John Doe",
  email: "johndoe@example.com",
  password: "password123",  // Will be hashed later
  avatar: {
    public_id: "avatar_123",
    url: "https://example.com/avatar.jpg"
  },
  role: "user",
  isVerified: true,
  courses: [
    { courseId: "course123" },
    { courseId: "course456" }
  ],
  async hashPassword() {
    this.password = await bcrypt.hash(this.password, 12);
  },
  SignRefreshToken(email: string) {
    return Jwt.sign({ email }, process.env.REFRESH_TOKEN as Secret || "", { expiresIn: "30d" });
  },
  SignAccessToken(email: string) {
    return Jwt.sign({ email }, process.env.ACCESS_TOKEN as Secret || "", { expiresIn: "5m" });
  },
  async comparePassword(password: string) {
    return bcrypt.compare(password, this.password);
  }
};

// Insert the dummy user and course into MongoDB
export async function createDummyData() {
  try {
    // Hash the user's password
    await dummyUser.hashPassword();

    // Insert dummy user
    const newUser = new userModel(dummyUser);
    await newUser.save();

    // Insert course data
    await courseModel.create(courseData);
   await reviewModel.create(reviewData);
   await commentModel.create(commentData);
   await courseDataModel.create(courseMaterialData);
   
    // You can also create reviews and comments separately as needed
  } catch (error) {
    console.error("Error creating dummy data:", error);
  }
}
