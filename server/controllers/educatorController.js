import { clerkClient } from "@clerk/express";
import Course from "../modals/Course.js";
import {v2 as cloudinary} from 'cloudinary'
import { Purchase } from "../modals/Purchase.js";

// update role to educator
export const updateRoleToEducator = async (req, res) => {
    console.log("updateRoleToEducator");

    try {
        if (!req.auth || !req.auth.userId) {
            return res.status(401).json({ success: false, message: "Unauthorized: No user ID found" });
        }

        const userId = req.auth.userId;
        // console.log(userId);

        await clerkClient.users.updateUserMetadata(userId, {
            publicMetadata: {
                role: "educator",
            },
        });

        res.json({ success: true, message: "You can publish a course now" });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


// Adding a new course

export const addCourse = async (req, res) => {
    console.log("addCourse");
    
    try {

        const {courseData} = req.body;
        const imageFile = req.file
        const educatorId = req.auth.userId
        
        if(!imageFile){
            return res.json({success: false, messsage: 'Thumbnail Not Attached'})
        }
        const parsedCourseData = await JSON.parse(courseData)
        parsedCourseData.educator = educatorId
        
        const newCourse = await Course.create(parsedCourseData)

        console.log(imageFile.path);
        
        const imageUpload = await cloudinary.uploader.upload(imageFile.path);
        newCourse.courseThumbnail = imageUpload.secure_url
        await newCourse.save()

        res.json({success: true, message: 'course added'})
    

    } catch (error) {
        res.json({success: false, message: error.message})
    }
}


// Get Educator Courses

export const getEducatorCourses = async (req,res) => {
    try {
        
        const educator = req.auth.userId
        const courses = await Course.find({educator})
        res.json({success: true, courses})

    } catch (error) {
        res.json({success: false, message: error.message})
    }
}

//Get Educator Dashboard Data

export const educatorDashboardData = async () => {
    try {
        
        const educator = req.auth.userId
        const courses = await Course.find({educator})
        const totalCourses = courses.length;

        const courseIds = courses.map(course => course._id)

        //  calculate total earning from purchases
        const purchases = await Purchase.find({
            courseId: {$in: courseIds},
            status: 'completed'
        });

        const totalEarnings = purchases.reduce((sum,purchase) => sum + purchase.amount, 0)

        // collect unique enrolled student IDs with their course titles
        const enrolledStudentsData = [];
        for(const course of courses){
            const students = await User.find({
                _id: {$in: course.enrolledStudents}
            }, 'name imageUrl');

            students.forEach(student => {
                enrolledStudentsData.push({
                    courseTitle: course.courseTitle,
                    student
                });
            })
        }

        res.json({success: true, dashboardData:{
            totalEarnings,
            enrolledStudentsData,
            totalCourses
        }})

    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

// Get Enrolled Students Data with Purchase Data
export const getEnrolledStudentsData = async (req, res) => {
    try {
        
        const educator = req.auth.userId
        const courses = await Course.find({educator})
        const courseIds = courses.map(course => course._id)

        const purchases = await Purchase.find({
            courseId : {$in: courseIds},
            status: 'completed'
        }).populate('userId', 'name imageUrl').populate('courseId', 'courseTitle')

        const enrolledStudents = purchases.map(purchase => ({
            student: purchase.userId,
            courseTitle: purchase.courseId.courseTitle,
            purchaseDate: purchase.createdAt
        }))

        res.json({success: true, enrolledStudents})

    } catch (error) {
        res.json({success: false, message: error.message})
    }
}


