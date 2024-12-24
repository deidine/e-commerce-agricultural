import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface ICourse extends Document {
    name: string;
    description: string;
    price: number;
    estimatedPrice?: number;
    thumbnail: object;
    tags: string;
    level: string;
    categories: string;
    demoUrl: string;
    benefits: { title: string }[];
    prequesities: { title: string }[];
    ratings?: number;
    purchased?: number;
    courseDataRef: Types.ObjectId
  }
const courseSchema = new Schema<ICourse>(
    {
      name: { type: String, required: true },
      description: { type: String, required: true },
      categories: { type: String, required: true },
      price: { type: Number, required: true },
      estimatedPrice: Number,
      courseDataRef: { type: Schema.Types.ObjectId, ref: "CourseData" },
      thumbnail: {
        public_id: { type: String },
        url: { type: String },
      },
      tags: { type: String, required: true },
      level: { type: String, required: true },
      demoUrl: { type: String, required: true },
      benefits: [{ title: String }],
      prequesities: [{ title: String }],
      ratings: { type: Number, default: 0 },
      purchased: { type: Number, default: 0 },
    },
    { timestamps: true }
  );
  
const courseModel = mongoose.model<ICourse>("Course", courseSchema);
export { courseModel  };
