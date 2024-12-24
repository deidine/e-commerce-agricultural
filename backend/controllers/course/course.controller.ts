import cloudinary from "cloudinary";
import { Request, Response, NextFunction } from "express";
import { catchAsyncError } from "../../middleware/catchAsyncErrors";
import { createCourse, getAllCoursesService } from "../../services/course.service";
import ErrorHandler from "../../utils/ErrorHandler";
import { redis } from "../../utils/redis";
import { courseModel } from "../../models/courses/course.model";
import mongoose from "mongoose";
import axios from "axios";
import { courseDataModel } from "../../models/courses/coursedata.model";

// Upload Course
export const uploadCourse = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
      console.log(req.body.thumbnail);

      try {
          const data = req.body;
          let thumbnail = data.thumbnail;

          // Ensure thumbnail is a string
          if (thumbnail && typeof thumbnail !== "string") {
              thumbnail = thumbnail.url; // Extract the URL if thumbnail is an object
          }

          if (thumbnail && typeof thumbnail === "string") {
              const myCloud = await cloudinary.v2.uploader.upload(thumbnail, {
                  folder: "courses",
              });

              data.thumbnail = {
                  public_id: myCloud.public_id,
                  url: myCloud.secure_url,
              };
          } else {
              return next(new ErrorHandler("Invalid thumbnail provided", 400));
          }

          await redis.del("getAllCourses");
          createCourse(data, res, next);
      } catch (error: any) {
          return next(new ErrorHandler(error.message, 400));
      }
  }
);


  
export const editCourse = catchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const data = req.body;
        const thumbnail = data.thumbnail;
        if (!thumbnail?.public_id) {
          // await cloudinary.v2.uploader.destroy(thumbnail.public_id);
          const myCloud = await cloudinary.v2.uploader.upload(thumbnail, {
            folder: "courses",
          });
  
          data.thumbnail = {
            public_id: myCloud.public_id,
            url: myCloud.secure_url,
          };
        }
        const courseId = req.params.id;
  
        const course = await courseModel.findByIdAndUpdate(
          courseId,
          { $set: data },
          { new: true }
        );
        await redis.set(courseId, JSON.stringify(course));
        res.status(201).json({
          success: true,
          course,
        });
      } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
      }
    }
  );
  
 
// ? Get single course --without purchasing

export const getSingleCourse = catchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
      console.log(req.user)
      console.log("getSingleCourse "+ req.params.id)
      try {
        const courseId = req.params.id;

        const isValidID = mongoose.isValidObjectId(courseId);
  
        if (isValidID) {
          const isCatchExist = await redis.get(courseId+"getSinddgleCourse");
  
          if (isCatchExist) {
            const course = JSON.parse(isCatchExist);
            res.status(200).json({
              success: true,
              course,
            });
          } else {
            // const course = await courseModel
            //   .findById(req.params.id)
            //   .populate({
            //     path: "courseDataRef",//forgenkey
            //     select: "-videoUrl -suggestion -questions -links",//exclude videoUrl,suggestion,questions,links
            //   }) 
            //   ;
            const course  = await courseModel.aggregate([
              {
                $match: { _id: new mongoose.Types.ObjectId(req.params.id) }, // Match course by ID
              },
              {
                $lookup: {
                  from: "coursedatas", // Collection name for `CourseData`
                  localField: "courseDataRef",
                  foreignField: "_id",
                  as: "courseData",
                },
              },
              {
                $lookup: {
                  from: "reviews", // Collection name for `reviews`
                  localField: "_id",
                  foreignField: "course",
                  as: "reviews",
                },
              },
              {
                $project: {
                  name: 1,
                  description: 1,
                  price: 1,
                  estimatedPrice: 1,
                  thumbnail: 1,
                  tags: 1,
                  level: 1,
                  categories: 1,
                  demoUrl: 1,
                  benefits: 1,
                  prerequisites: 1,
                  ratings: 1,
                  purchased: 1,
                  courseDataRef: 1,
                  _id: 1,

                  courseData: { title: 1, description: 1 }, // Only project required fields
                  reviews: { userId: 1, rating: 1, comment: 1, createdAt: 1 }, // Project specific review fields
                },
              },
            ]);
            console.log(JSON.stringify(course))
            if (!course || course.length === 0) {
              return res.status(404).json({ success: false, message: "Course not found" });
            }            
  
            await redis.set(courseId, JSON.stringify(course), "EX", 604800);
            res.status(200).json({
              success: true,
              course,
            });
          }
        } else {
          return next(new ErrorHandler("Invalid Object ID", 400));
        }
      } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
      }
    }
  );
  
  // ? Get single course --for Admin Only
  
  export const getSingleCourseAdminOnly = catchAsyncError(
    
    async (req: Request, res: Response, next: NextFunction) => {
    
      console.log(req.user)
      console.log("getSingleCourseAdminOnly")
      try {
        const courseId = req.params.id;
  
        // ChecknID is Valid or Not
  
        const isValidID = mongoose.isValidObjectId(courseId);
  
        if (isValidID) {
          // Check Cache is Exist
          const isCatchExist = await redis.get(courseId);
  
          if (isCatchExist) {
            const course = JSON.parse(isCatchExist);
            res.status(200).json({
              success: true,
              course,
            });
          } else {
            const course = await courseModel.findById(req.params.id);
  
            if (!course) {
              return next(new ErrorHandler("Course not found", 400));
            }
  
            await redis.set(courseId, JSON.stringify(course), "EX", 604800);
            res.status(200).json({
              success: true,
              course,
            });
          }
        } else {
          return next(new ErrorHandler("Invalid Object ID", 400));
        }
      } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
      }
    }
  );
  
  // ? Get All courses --without purchasing
  
  export const getAllCourses = catchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
 
      try {
        await redis.del("getAllCourses");
  
        const isCatchExist = await redis.get("getAllCourses");
        if (isCatchExist) {
          const { courses, Total } = JSON.parse(isCatchExist);
         
          res.status(200).json({
            success: true,
            Total,
            courses,
          });
  
        } else {
          const courses = await courseModel
            .find()
            .select(
              "-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links"
            );
          const Total = await courseModel.countDocuments();
  
          await redis.set("getAllCourses", JSON.stringify({ courses, Total }));
          res.status(200).json({
            success: true,
            Total,
            courses,
          });
        }
      } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
      }
    }
  );
  
  // get course content -- only for valid user
  
  export const getCourseByUser = catchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const userCoursesList = req.user?.courses;
        const courseId = req.params.id;
        const courseExist = userCoursesList?.find(
          (course: any) => course._id.toString() === courseId
        );
  
        if (!courseExist) {
          return next(
            new ErrorHandler("You are not eligible for this course", 400)
          );
        }
        const content   = await courseDataModel.findById(courseId);
   
  
        res.status(200).json({
          success: true,
          content,
        });
      } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
      }
    }
  );
  

  
// Get All Courses --admin-only

export const getAllCoursesByAdmin = catchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        console.log("deidine\n\n\n\n\n\n\n\n\ndeidine")
        getAllCoursesService(res);
      } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
      }
    }
  );
  
  // DELETE Course ---ONLY FOR ADMIN
  
  export const deleteCourse = catchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params;
  
        const course = await courseModel.findById(id);
        if (!course) {
          return next(new ErrorHandler("course not found", 400));
        }
  
        await course.deleteOne({ id });
  
        await redis.del(id);
        res.status(201).json({
          success: true,
          message: "Course Delete Successfully",
        });
      } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
      }
    }
  );
  
  // Generate Video URL
  
  export const generateVideoUrl = catchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { videoId } = req.body;
        const response = await axios.post(
          `https://dev.vdocipher.com/api/videos/${videoId}/otp`,
          { ttl: 300 },
          {
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              Authorization: `Apisecret ${process.env.VDOCIPHER_SECRET_API}`,
            },
          }
        );
        res.json(response.data);
      } catch (error: any) {
        return new ErrorHandler(error.message, 400);
      }
    }
  );