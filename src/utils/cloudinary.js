import {v2 as cloudinary} from "cloudinary"
import fs from "fs"


// cloudinary.config({ 
//     cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
//     api_key: process.env.CLOUDINARY_API_KEY, 
//     api_secret: process.env.CLOUDINARY_API_SECRET
// });



cloudinary.config({ 
    cloud_name: 'sahil123', 
    api_key: '949388884378679', 
    api_secret: 'dSxlL4m6537QmI8wbZ2jxCTMdLo' 
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null
       
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })
        console.log("file is uploaded on cloudinary ", response.url);
        fs.unlinkSync(localFilePath)
        return response;

    } catch (error) {
        fs.unlinkSync(localFilePath) 
        return null;
    }
}



export {uploadOnCloudinary}