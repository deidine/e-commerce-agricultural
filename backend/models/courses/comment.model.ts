import mongoose, { Document, Model, Schema, Types } from "mongoose";
import { IUser } from "../user.model";

interface IComment extends Document {
    user: IUser;
    question: string;
    questionReplies?: Types.ObjectId[]; // References to Comment
  }
  
  
  // Comment Schema
const commentSchema = new Schema<IComment>(
    {
      user: { type: Schema.Types.ObjectId, ref: "User" },
      question: { type: String, required: true },
      questionReplies: [{ type: Schema.Types.ObjectId, ref: "Comment" }],
    },
    { timestamps: true }
  );
  
  const commentModel = mongoose.model<IComment>("Comment", commentSchema);
export { commentModel };