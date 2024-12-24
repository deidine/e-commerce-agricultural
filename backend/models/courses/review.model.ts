import mongoose, { Document, Model, Schema, Types } from "mongoose";
import { IUser } from "../user.model";
interface IReview extends Document {
    user: IUser;
    rating: number;
    comment: string;
    course: Types.ObjectId; // Reference to Course
    commentReplies?: Types.ObjectId[]; // References to Comment
  }
// Review Schema
const reviewSchema = new Schema<IReview>(
    {
      user: { type: Schema.Types.ObjectId, ref: "User" },
      rating: { type: Number, default: 0 },
      comment: { type: String, required: true },
      course: { type: Schema.Types.ObjectId, ref: "Course", required: true }, // Reference to Course
      commentReplies: [{ type: Schema.Types.ObjectId, ref: "Comment" }],
    },
    { timestamps: true }
  );

  
const reviewModel = mongoose.model<IReview>("Review", reviewSchema);
export { reviewModel };