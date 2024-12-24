import { Request, Response, NextFunction } from "express"; 
import ejs from "ejs";
import mongoose from "mongoose";
import path from "path";
import { catchAsyncError } from "../../middleware/catchAsyncErrors";
import { courseModel } from "../../models/courses/course.model";
import NotificationModel from "../../models/notification.model";
import ErrorHandler from "../../utils/ErrorHandler";
import sendMail from "../../utils/sendMail";
import { courseDataModel } from "../../models/courses/coursedata.model";
import { commentModel } from "../../models/courses/comment.model";

// Add Question to Course
interface IAddQuestionData {
    question: string;
    courseId: string;
    contentId: string;
}

export const addQuestion = catchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
        console.log("Add Question",req.user)

        try {
            const { question, courseId, contentId } = req.body as IAddQuestionData;

            // Ensure courseId and contentId are valid ObjectId
            if (!mongoose.Types.ObjectId.isValid(courseId) || !mongoose.Types.ObjectId.isValid(contentId)) {
                return next(new ErrorHandler("Invalid Course or Content ID", 400));
            }

            const course = await courseModel.findById(courseId);
            if (!course) {
                return next(new ErrorHandler("Course not found", 404));
            }
            
            const courseContent = await courseDataModel.findById(contentId);
            console.log(req.user)
            if (!courseContent) {
                return next(new ErrorHandler("Content not found", 404));
            }

            // Create question object
            const newQuestion = {
                user: req.user!._id,
                question,
                questionReplies: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            // Add the question to the database
            const createdQuestion = await commentModel.create(newQuestion);

            // Add the question reference to the course content
            courseContent.questions.push(createdQuestion._id);
            await courseContent.save();

            // Notify the user
            await NotificationModel.create({
                userId: req.user?._id,
                title: `New Question from ${req.user?.name}`,
                message: `You have a new question in ${courseContent.title}`,
            });

            // Aggregate course with questions and responses
            const updatedCourse = await courseDataModel.aggregate([
                { $match: { _id: new mongoose.Types.ObjectId(contentId) } },
                {
                    $lookup: {
                        from: "comments", // Collection name for comments/questions
                        localField: "questions",
                        foreignField: "_id",
                        as: "questions",
                    },
                },
            ]);

            res.status(200).json({
                success: true,
                course: updatedCourse[0], // Return course content with the new question
            });
        } catch (error: any) {
            return next(new ErrorHandler(error.message, 500));
        }
    }
);

// Add Answer to a Question
interface IAddAnswerData {
    answer: string;
    courseId: string;
    contentId: string;
    questionId: string;
}

export const addAnswer = catchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
        console.log("Add Answer")
        try {
            const { answer, courseId, contentId, questionId } = req.body as IAddAnswerData;

            // Ensure IDs are valid ObjectId
            if (!mongoose.Types.ObjectId.isValid(courseId) || !mongoose.Types.ObjectId.isValid(contentId) || !mongoose.Types.ObjectId.isValid(questionId)) {
                return next(new ErrorHandler("Invalid IDs provided", 400));
            }

            const course = await courseModel.findById(courseId);
            if (!course) {
                return next(new ErrorHandler("Course not found", 404));
            }

            const courseContent = await courseDataModel.findById(contentId);
            if (!courseContent) {
                return next(new ErrorHandler("Content not found", 404));
            }

            const question = await commentModel.findById(questionId);
            if (!question) {
                return next(new ErrorHandler("Question not found", 404));
            }

            // Create the answer object
            const newAnswer = new commentModel({
              user: req.user!._id,
              answer,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
            
          
      // Save the answer to get the generated _id
      const savedAnswer = await newAnswer.save();

      // Add the answer's _id to the questionReplies array
      question.questionReplies!.push(savedAnswer._id);
      await question.save();

            // Notify the user if they are not replying to their own question
            if (String(req.user?._id) !== String(question.user)) {
                const data = {
                    name: question.user.name,
                    title: courseContent.title,
                };

                const html = await ejs.renderFile(
                    path.join(__dirname, "../mails/question-reply.ejs"),
                    data
                );

                await sendMail({
                    email: question.user.email,
                    subject: "New Answer to Your Question",
                    template: "question-reply.ejs",
                    data,
                });
            } else {
                await NotificationModel.create({
                    userId: req.user?._id,
                    title: "Answer to Your Question",
                    message: `${req.user?.name} replied to your question in ${courseContent.title}`,
                });
            }

            // Aggregate the question with answers
            const updatedQuestion = await commentModel.aggregate([
                { $match: { _id: new mongoose.Types.ObjectId(questionId) } },
                {
                    $lookup: {
                        from: "users", // Collection for users (assuming user data is stored separately)
                        localField: "questionReplies.user",
                        foreignField: "_id",
                        as: "questionReplies.userDetails",
                    },
                },
            ]);

            res.status(200).json({
                success: true,
                question: updatedQuestion[0], // Return the updated question with answers and user details
            });
        } catch (error: any) {
            return next(new ErrorHandler(error.message, 500));
        }
    }
);
