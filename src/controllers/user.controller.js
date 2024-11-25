import {asyncHandler} from "../utils/asyncHandler.js";
import{ApiError} from "../utils/ApiError.js"
import {User  } from "../models/user.model.js";
import {uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";


const registerUser=asyncHandler( async(req,res)=>{
    const {fullName,email,username,password}=req.body;
   
    console.log(req.body)

// if(
//    [ fullName,email,username,password].some((field)=>field?.trim()==="") 
// ){
//     throw new ApiError(400," all fiels required");
    
// }
 
if ([username, fullName, email, password].some(field =>field ===undefined ||  field?.trim() === "")) { 
throw new ApiError(400, "All field are required !!"); 
}



  const existedUser= await User.findOne({
    $or:[{username},{email}]
})

if(existedUser){
    throw new ApiError(409,"username or email already exist");
}
// console.log(req.files)


 const avatarLocalPath=req.files?.avatar[0]?.path;
 const coverImageLocalPath=req.files?.coverImage?.[0].path; // added ?after coverImage

 if(!avatarLocalPath){
    throw new ApiError(400,"avatar is required");
 }

  const avatar= await uploadOnCloudinary(avatarLocalPath)
  const coverImage= await uploadOnCloudinary(coverImageLocalPath)
if(!avatar){
    throw new ApiError(400,"avatar upload failed");
}

  const user= await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url ||"",
    email,
    password,
    username : username.toLowerCase()

})
  const createdUser =await User.findById(user._id).select(
    " -password -refreshToken"
  )
  if(!createdUser){
    throw new ApiError(500,"something went wrong while registering");
  }

  return res.status(201).json(
    new ApiResponse(200,createdUser,"User registered successfully ")
  )


 
})

export { registerUser};