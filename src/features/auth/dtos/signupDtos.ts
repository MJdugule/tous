export interface SignupDTO {
  username: string;
  email: string;
  password: string;
}

export interface VerifyEmailDTO {
  email: string;
  otp: string;
}