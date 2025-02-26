import Stripe from "stripe"
import Course from "../modals/Course.js"
import { Purchase } from "../modals/Purchase.js"
import User from "../modals/User.js"
import { CourseProgress } from "../modals/courseProgress.js"

// get user data
export const getUserData = async (req, res) => {
    console.log("getUserData");
    
    try {
        
        const userId = req.auth.userId
        const user = await User.findById(userId)

        console.log("Fetched user:", user);


        if(!user){
            return res.json({success: false, message: 'User not found'})
        }

        res.json({success: true, user})

    } catch (error) {
        res.json({success: false, message: error.message})
    }
}

//  user enrolled courses with lecture link
export const userEnrolledCourses = async (req, res) => {
    console.log("userEnrolledCourses");

    try {
        const userId = req.auth?.userId; // Ensure `userId` exists
        if (!userId) {
            return res.json({ success: false, message: "Unauthorized: No user ID found" });
        }

        const userData = await User.findById(userId).populate("enrolledCourses");

        if (!userData) {
            return res.json({ success: false, message: "User not found" });
        }

        // console.log("User Data:", userData); // Debugging

        res.json({ success: true, enrolledCourses: userData.enrolledCourses || [] });

    } catch (error) {
        console.error("Error fetching enrolled courses:", error); // Log error
        res.json({ success: false, message: error.message });
    }
};


// tO PURCHASE A COURSE

export const purchaseCourse = async (req, res) => {
    console.log("purchaseCourse");
    
    try {
        
        const {courseId} = req.body
        const {origin} = req.headers
        const userId = req.auth.userId
        const userData = await User.findById(userId)
        const courseData = await Course.findById(courseId)

        if(!userData || !courseData){
            return res.json({success: false, message: 'Data Not Found'})
        }

        const purchaseData = {
            courseId: courseData._id,
            userId,
            amount: (courseData.coursePrice - courseData.discount * courseData.coursePrice / 100).toFixed(2),
        }

        const newPurchase = await Purchase.create(purchaseData)

        // Stripe Gateway Initialize
        const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY)

        const currency = process.env.CURRENCY.toLowerCase()

        // Creating line items to for stripe
        const line_items = [{
            price_data: {
                currency,
                product_data:{
                    name: courseData.courseTitle
                },
                unit_amount: Math.floor(newPurchase.amount) * 100,
            },
            quantity: 1
        }]

        const session = await stripeInstance.checkout.sessions.create({
            success_url: `${origin}/loading/my-enrollments`,
            cancel_url: `${origin}`,
            line_items: line_items,
            mode: 'payment',
            metadata: {
                purchaseId: newPurchase._id.toString()
            }
        })

        res.json({success: true, session_url: session.url})

    } catch (error) {
        res.json({success: false, message: error.message})
    }
}


// update user courseProgress

export const updateUserCourseProgress = async (req, res) => {

    console.log("updateUserCourseProgress");
    
    try {
        
        const userId = req.auth.userId
        const {courseId, lectureId} = req.body
        const progressData = await CourseProgress.findOne({userId, courseId})
        
        if(progressData){
            if(progressData.lectureCompleted.includes(lectureId)){
                return res.json({success: true, message: 'lecture already completed'})
            }
            
            progressData.lectureCompleted.push(lectureId)
            await progressData.save()
        }else{
            await CourseProgress.create({
                userId,
                courseId,
                lectureCompleted: [lectureId]
            })
        }
        res.json({success: true, message: "progress updated"})
        
    } catch (error) {
        res.json({success: false, message: error.message})
    }
    
}

// get user course progress

export const getUserCourseProgress = async (req, res) => {

    console.log("getUserCourseProgress");
    

    try {

        const userId = req.auth.userId
        const {courseId} = req.body
        const progressData = await CourseProgress.findOne({userId, courseId})

        res.json({success: true, progressData})
        
    } catch (error) {
        res.json({success: false, message: error.message})
    }
}

// Add User Rating to course

export const addUserRating = async (req, res) => {

    console.log("addUserRating");
    

    const userId = req.auth.userId
    const {courseId, rating} = req.body;

    if (!courseId || !userId || rating < 1 || rating > 5) {
        return res.json({ success: false, message: 'Invalid Details' });
    }    

    try {
        
        const course = await Course.findById(courseId);

        if(!course){
            return res.json({success: false, message: 'Course not found'})
        }

        const user = await User.findById(userId)

        if(!user || !user.enrolledCourses.includes(courseId)){
            return res.json({success: false, message: 'User has not purchased this course.'})
        }

        const existingRatingIndex = course.courseRatings.findIndex(r => r.userId === userId)

        if(existingRatingIndex > -1){
            course.courseRatings[existingRatingIndex].rating = rating
        }else{
            course.courseRatings.push({userId, rating})
        }
        await course.save()

        return res.json({success: true, message: 'Rating Added'})

    } catch (error) {
        res.json({success: false, message: error.message})
    }

}