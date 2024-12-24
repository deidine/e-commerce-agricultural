import { Response } from "express";
import { catchAsyncError } from "../middleware/catchAsyncErrors";
import { courseModel } from "../models/courses/course.model";
import { courseDataModel } from "../models/courses/coursedata.model";
 
export const createCourse = catchAsyncError(async (data: any, res: Response) => {
  const { courseData, ...courseDetails } = data;

  const createdCourseData = await courseDataModel.create(courseData);

  const course = await courseModel.create({
    ...courseDetails,
    courseDataRef: createdCourseData._id,  
  });

  res.status(201).json({
    success: true,
    course,
  });
});



// Get All Courses

export const getAllCoursesService = async (res: Response) => {
  const courses = await courseModel.find().sort({ createdAt: -1 });

  res.status(201).json({
    success: true,
    courses,
  });
};