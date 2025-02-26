import {clerkClient} from '@clerk/express'


// Middleware (protect educator routes)

export const protectEducator = async (req, res, next) => {
    console.log("protectEducator");
    
    try {
        
        const userId = req.auth.userId
        const response = await clerkClient.users.getUser(userId)

        if(response.publicMetadata.role !== 'educator'){
            return res.json({success: false, message: 'Unauthorised Access'})
        }

        next()

    } catch (error) {
        res.json({success: false, message: error.message})
    }
}