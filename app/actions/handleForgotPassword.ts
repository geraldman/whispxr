"use server";

import { adminAuth, adminDb  } from "@/lib/firebase/firebaseAdmin";
import { sendCustomPasswordResetEmail } from "@/lib/mailer/mailer";

export async function handleForgotPassword(email: string){
    // TODO
    // Validate if the email is legit (no need because its prone to email enumeration)
    // send the reset password link
    try{
        const actionCodeSettings = {
            url: 'http://localhost:3000/usermgmt', // redirect after password reset
            handleCodeInApp: true, // true if you're handling it inside your app
        };

        const querySnapshot = await adminDb
        .collection("users")
        .where("email", "==", email.trim().toLowerCase())
        .get();

        if(querySnapshot.empty){
            console.log(querySnapshot.size);
            return true;
        }

        const username = querySnapshot.docs[0].data().username;

        const link = await adminAuth.generatePasswordResetLink(email, actionCodeSettings);
        await sendCustomPasswordResetEmail(email, username, link)
        return true;
    }
    catch(error){
        console.log(error); // REMOVE THIS LATER FOR PREVENTING EMAIL ENUMERATION
        return true;
    }
}