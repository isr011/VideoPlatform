import dotenv from "dotenv"

import {asyncHandler} from "../utils/asyncHandler.js";
import{ApiError} from "../utils/ApiError.js"
import {User  } from "../models/user.model.js";
import {uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
dotenv.config()


const generateAccessAndRefreshTokens= async(userId)=>{
  try {
    const user = await User.findById(userId)
      const accessToken =user.generateAccessToken()
     const refreshToken =user.generateRefreshToken()
     console.log("refresh token is ",refreshToken)
     user.refreshToken=refreshToken
     await user.save({validateBeforeSave:false})
     return {accessToken,refreshToken}
    
  } catch (error) {
    throw new ApiError(500," something went wrong while generating token")
    
  }
}



const registerUser=asyncHandler( async(req,res)=>{
    // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res
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
 console.log(req.files)


 const avatarLocalPath=req.files?.avatar[0]?.path;
 const coverImageLocalPath=req.files?.coverImage && req.files?.coverImage[0]?.path;

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

const loginUser= asyncHandler(async(req,res)=>{
 // req body -> data
    // username or email
    //find the user
    //password check
    //access and referesh token
    //send cookie
    const {email, username, password}=req.body
    console.log(email);
    console.log(password);

    if(!username && !email){
      throw new ApiError(400,"username or email is required")
    }
       const user = await User.findOne({
      $or: [{ email }, { username }]
    })
    if(!user){
      throw new ApiError(404,"user does not exist ")
    }
    const isPasswordValid = await user.isPasswordCorrect(password)
    if(!isPasswordValid){
      throw new ApiError(401,"invalid password")
      }
       const {accessToken,refreshToken}=await generateAccessAndRefreshTokens(user._id)

        const loggedInUser= await User.findById(user._id).select("-password -refreshToken")
        const options={
          httpOnly:true,
          secure:true
        }
        return res
        .status(200).cookie("accessToken",accessToken,options)
        .cookie("refreshToken",refreshToken,options)
        .json(
          new ApiResponse(
            200,
            {
              user:loggedInUser, accessToken, refreshToken
            },
            "logged in successfully "
          )
        )
        



})




const logoutUser=asyncHandler(async(req,res)=>{
   await User.findByIdAndUpdate(
    req.user._id,
    {
      $set:{
        refreshToken:undefined
      }

    },
    {
      new:true
    }
  )
  const options={
    httpOnly:true,
    secure:true
  }
  return res
  .status(200)
  .clearCookie("accessToken",options)
  .clearCookie("refreshToken",options)
  .json(new ApiResponse(200,{},"User logout successfully"))

})

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

  if (!incomingRefreshToken) {
      throw new ApiError(401, "unauthorized request")
  }

  try {
      const decodedToken = jwt.verify(
          incomingRefreshToken,
          process.env.REFRESH_TOKEN_SECRET
      )
  
      const user = await User.findById(decodedToken?._id)
  
      if (!user) {
          throw new ApiError(401, "Invalid refresh token")
      }
  
      if (incomingRefreshToken !== user?.refreshToken) {
          throw new ApiError(401, "Refresh token is expired or used")
          
      }
  
      const options = {
          httpOnly: true,
          secure: true
      }
  
      const {accessToken, newRefreshToken} = await generateAccessAndRefereshTokens(user._id)
  
      return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
          new ApiResponse(
              200, 
              {accessToken, refreshToken: newRefreshToken},
              "Access token refreshed"
          )
      )
  } catch (error) {
      throw new ApiError(401, error?.message || "Invalid refresh token")
  }

})


const changeCurrentPassword= asyncHandler(async(req,res)=>{
  const {oldPassword, newPassword} = req.body
  const user = await User.findById(req.user?._id)
 const isPasswordCorrect= await  user.isPasswordCorrect(oldPassword)
 if(!isPasswordCorrect){
  throw new ApiError(400,"invalid old password");
 }
 user.password=newPassword
 await user.save({validateBeforeSave:false})
  return res.status(200)
  .json(new ApiResponse(200,{},"password changed successfully"))


})

const getCurrentUser= asyncHandler(async(req,res)=>{
  return  res.status(200)
  .json(new ApiResponse(200,req.user," Current user found"))

})


const updateAccountDetail=  asyncHandler(async(req,res)=>{
  const {fullName, email,} = req.body
  if(!fullName || !email){
    throw new ApiError(400,"all fields required")
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set:{
        fullName,
         email
      }

    },
    {new:true}
  ).select("-password")
return res
.status(200)
.json(new ApiResponse(200,req.user,"Account updated successfully"))

})


const updateUserAvatar=asyncHandler(async(req,res)=>{
  const avatarLocalPath = req.file?.path
  if(!avatarLocalPath){
    throw new ApiError(400,"avatar not found");
  }

  const avatar =await uploadOnCloudinary(avatarLocalPath)
  if(!avatar.url){
    throw new ApiError(400,"avatar upload failed");
  }
 const user=await User.findByIdAndUpdate(
  req.user?._id,
  {
    $set:{
      avatar:avatar.url
    }

  },{  new:true }
).select("-password")
return res
.status(200)
.json(new ApiResponse(200,user,"User  avatar updated successfully"))


})

const updateUserCoverImage=asyncHandler(async(req,res)=>{
  const CoverImageLocalPath = req.file?.path
  if(!CoverImageLocalPath){
    throw new ApiError(400,"CoverImage not found");
  }

  const coverImage =await uploadOnCloudinary(CoverImageLocalPath)
  if(!coverImage.url){
    throw new ApiError(400,"coverImage upload failed");
  }
 const user=await User.findByIdAndUpdate(
  req.user?._id,
  {
    $set:{
      coverImage:coverImage.url
    }

  },{  new:true }
).select("-password")

return res
.status(200)
.json(new ApiResponse(200,user,"User  coverIamge updated successfully"))

})


const getUserChannelProfile=  asyncHandler(async(req,res)=>{
const{username}= req.params
if(!username?.trim()){
  throw new ApiError(400,"username is required");
}
 const channel = await User.aggregate([
  // subscriber
  {
    $match:{
      username:username?.toLowerCase()
      }
  },
  {
    $lookup:{
      from:"Subscription",
      localField:"_id",
      foreignField:"channel",
      as:"subscribers"  // no of subscriber
    }
  },
  {
    $lookup:{
      from:"Subscription",
      localField:"_id",
      foreignField:"subscriber",
      as:"subscribedTo" // whom i have subscribed


    }
  },
  {
    $addFields:{
      subscribersCount:{
        $size:"$subscribers"// getting no of subscriber
      },
      channelsSubscribedToCount:{
        $size:"$subscribedTo" // to whom i have subscribed 
      },
      isSubscribed:{
        $cond:{
          if:{
            $in:[req.user._id,"$subscribers.subscriber"]
            
          },
          then:true,
          else:false
        }
      }
    }
  },
  {
    $project:{
      fullName:1,
      username:1,
      subscribersCount:1,
      channelsSubscribedToCount:1,
      isisSubscribed:1,
      avatar:1,
      coverImage:1,
      email:1

    }
  }
 ])
 if( !channel?.length){
  throw new ApiError(404," channel does not exists")
 }
 return res
 .status(200)
 .json(
  new ApiResponse(200, channel[0]," userchannel fetched successfully")
 )

})


export { 
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetail,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile
  

};