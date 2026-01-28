import { NextResponse } from "next/server";

// Yeh line zaroori hai. 'export' middleware function ko Next.js ke liye available banata hai.
export function middleware(request) {
  // User ke browser se authentication token (cookie) hasil karein
  const authToken = request.cookies.get("auth-token")?.value;

  // User jis page par jaana chah raha hai, uska path hasil karein
  const { pathname } = request.nextUrl;

  // Login page public hai
  const isPublicPath = pathname === "/login";

  // Agar user ek protected route par hai (login page ke ilawa) aur uske pas token nahi hai
  if (!isPublicPath && !authToken) {
    // To usko login page par bhej dein
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Agar user logged in hai (uske pas token hai) aur woh login page par jane ki koshish kar raha hai
  if (isPublicPath && authToken) {
    // To usko home page par bhej dein
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Agar upar wali koi bhi condition aapse nahi hoti, to user ko page access karne dein
  return NextResponse.next();
}

// Yeh batata hai ke middleware kin pages par chalega
export const config = {
  matcher: [
    "/",
    "/login",
    // Yahan aap apne doosre protected pages bhi daal sakte hain
    // '/dashboard/:path*',
  ],
};


