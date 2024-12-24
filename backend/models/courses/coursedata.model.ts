import mongoose, { Document, Model, Schema, Types } from "mongoose";

interface ILink extends Document {
    title: string;
    url: string;
  }
  // Link Schema
const linkSchema = new Schema<ILink>({
    title: { type: String, required: true },
    url: { type: String, required: true },
  });
// Course Data Interface
interface ICourseData extends Document {
    title: string;
    description: string;
    videoUrl: string;
    videoThumbnail: object;
    videoSection: string;
    videoLength: number;
    videoPlayer: string;
    links: ILink[];
    suggestion: string;
    questions: Types.ObjectId[]; // References to Comment
  }
  
  const courseDataSchema = new Schema<ICourseData>({
    title: { type: String, required: true },
    description: { type: String, required: true },
    videoUrl: { type: String, required: true },
    videoThumbnail: Object,
    videoSection: String,
    videoLength: Number,
    videoPlayer: String,
    links: [linkSchema],
    suggestion: String,
    questions: [{ type: Schema.Types.ObjectId, ref: "Comment" }],
  });
  

const courseDataModel = mongoose.model<ICourseData>("CourseData", courseDataSchema);
export { courseDataModel };

