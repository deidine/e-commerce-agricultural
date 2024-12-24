import { Request, Response, NextFunction } from "express";
import { catchAsyncError } from "../../middleware/catchAsyncErrors";
import ErrorHandler from "../../utils/ErrorHandler";
import NotificationModel from "../../models/notification.model";
import { redis } from "../../utils/redis";
import { reviewModel } from "../../models/courses/review.model";
import { courseModel } from "../../models/courses/course.model";

// Add Review to Course
interface IAddReviewData {
  review: string;
  courseId: string;
  rating: string;
  userId: string;
}

export const addReview = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userCourseList = req.user?.courses;
      const courseId = req.params.id;

      // Ensure course exists in user's course list
      const courseExists = userCourseList?.some(
        (course: any) => String(course._id) === courseId
      );

      if (!courseExists) {
        return next(
          new ErrorHandler("You are not enrolled in this course", 403)
        );
      }

      const course = await courseModel.findById(courseId);
      if (!course) {
        return next(new ErrorHandler("Course not found", 404));
      }

      const { review, rating } = req.body as IAddReviewData;

      const reviewData: any = {
        user: req.user!._id,
        course: courseId, // Link the review with the course
        comment: review,
        rating: Number(rating), // Cast rating to a number
      };

      // Create new review
      await reviewModel.create(reviewData);

      // Clear Redis cache for the course
      await redis.del(course._id);

      // Aggregation pipeline to calculate average rating and number of reviews
      const updatedCourse = await courseModel.aggregate([
        {
          $match: {
            _id: course._id,
          },
        },
        {
          $lookup: {
            from: "reviews", // Collection name for reviews
            localField: "_id", // Course ID in courseModel
            foreignField: "course", // Matching course field in reviewModel
            as: "reviews", // Output as "reviews"
          },
        },
        {
          $addFields: {
            totalReviews: { $size: "$reviews" }, // Calculate total number of reviews
            avgRating: { $avg: "$reviews.rating" }, // Calculate average rating
          },
        },
      ]);

      if (!updatedCourse || !updatedCourse[0]) {
        return next(new ErrorHandler("Course aggregation failed", 500));
      }

      const updatedCourseData = updatedCourse[0];
      course.ratings = updatedCourseData.avgRating;
      await course.save();

      // Create notification for review
      await NotificationModel.create({
        userId: req.user?._id,
        title: "New Review Received",
        message: `${req.user?.name} has reviewed ${course?.name}`,
      });

      res.status(200).json({
        success: true,
        course: updatedCourseData,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// Add Reply to a Review
interface IAddReplyReview {
  comment: string;
  courseId: string;
  reviewId: string;
}

export const addReplyToReview = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { comment, courseId, reviewId } = req.body as IAddReplyReview;

      const course = await courseModel.findById(courseId);
      if (!course) {
        return next(new ErrorHandler("Course not found", 404));
      }

      const review = await reviewModel.findById(reviewId);
      if (!review) {
        return next(new ErrorHandler("Review not found", 404));
      }
 
      review.commentReplies = review.commentReplies || [];
      review.commentReplies.push(review._id);

      // Clear Redis cache for the course
      await redis.del(course._id);

      await review.save();
      res.status(200).json({
        success: true,
        course,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);
export const getAllReviews = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courseId = req.params.id;

      // Check if the course exists
      const course = await courseModel.findById(courseId);
      if (!course) {
        return next(new ErrorHandler("Course not found", 404));
      }

      // Fetch all reviews for the course
      const reviews = await reviewModel.find({ course: courseId }).populate("user", "name avatar");

      res.status(200).json({
        success: true,
        reviews,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);