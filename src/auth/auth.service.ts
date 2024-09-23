import { ConflictException, Injectable, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuthDto } from './auth.dto';
import { User, UserDocument } from './../users/users.model';
import { MailerService } from '@nestjs-modules/mailer'; // For sending email
import { randomBytes } from 'crypto'; // To generate random tokens
import * as bcrypt from 'bcrypt';
import { generateOTP, sendOtpEmail, sendOtpSms, validateEmail } from 'utils/auth.utils';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,

    private readonly jwtService: JwtService, // Inject JwtService
    private readonly mailerService: MailerService, // If used
  ) { }

  // Register method as an arrow function
  register = async (authDto: AuthDto): Promise<{ message: string; user: User }> => {
    try {
      // Check for existing email or mobile number
      const [existingEmailUser, existingMobileUser] = await Promise.all([
        this.userModel.findOne({ email: authDto.email }),
        this.userModel.findOne({ mobile: authDto.mobile }),
      ]);

      if (existingEmailUser) {
        throw new ConflictException('Email already exists');
      }
      if (existingMobileUser) {
        throw new ConflictException('Mobile number already exists');
      }

      const newUser = new this.userModel({
        firstName: authDto.firstName,
        lastName: authDto.lastName,
        email: authDto.email,
        mobile: authDto.mobile,
        role: authDto.role,
        status: authDto.status,
        profile: authDto.profile,
        addresses: authDto.addresses,
      });
      const savedUser = await newUser.save();

      return {
        message: 'Registration successful',
        user: savedUser,
      };
    } catch (err: unknown) {
      if (err instanceof Error) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }
  }


  // Login method with OTP logic (arrow function)
  verifyOtp = async (authDto: AuthDto): Promise<{ message: string }> => {
    try {
      // Ensure either email or mobile is provided
      if (!authDto.email && !authDto.mobile) {
        throw new BadRequestException('Either email or mobile number must be provided.');
      }

      const isEmail = validateEmail(authDto.email);
      const user = await this.userModel.findOne(isEmail ? { email: authDto.email } : { mobile: authDto.mobile });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const otp = generateOTP();
      const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // OTP expires in 5 minutes

      // Hash the OTP before saving
      const hashedOtp = await bcrypt.hash(otp, 10); // 10 is the salt rounds
      user.otp = hashedOtp;
      user.otpExpires = otpExpires;
      await user.save();

      // Send OTP via email or SMS
      if (isEmail) {
        await sendOtpEmail(user.email, otp);
      } else {
        await sendOtpSms(user.mobile.toString(), otp);
      }

      return { message: 'OTP sent successfully' };

    } catch (error: any) {
      if (error instanceof NotFoundException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new BadRequestException('OTP failed. Please check your credentials and try again.', error.message);
    }
  };

  // Method to verify OTP and complete login (arrow function)
  login = async (authDto: AuthDto): Promise<{ access_token: string; user: Partial<User> }> => {
    try {
      // Ensure either email or mobile is provided
      if (!authDto.email && !authDto.mobile) {
        throw new BadRequestException('Either email or mobile number must be provided.');
      }

      const isEmail = validateEmail(authDto.email);
      const user = await this.userModel.findOne(isEmail ? { email: authDto.email } : { mobile: authDto.mobile });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Ensure otp and otpExpires are defined
      if (!user.otp || !user.otpExpires || user.otpExpires < new Date()) {
        throw new UnauthorizedException('Invalid or expired OTP');
      }

      // Ensure authDto.otp is a string
      if (!authDto.otp) {
        throw new UnauthorizedException('OTP must be provided.');
      }

      // Verify the OTP against the hashed OTP in the database
      const isOtpValid = await bcrypt.compare(authDto.otp, user.otp);
      if (!isOtpValid) {
        throw new UnauthorizedException('Invalid OTP');
      }

      // OTP is valid, clear it from the user record
      user.otp = undefined; // Remove the OTP
      user.otpExpires = undefined; // Remove OTP expiration
      await user.save(); // Save the updated user

      const payload = { email: user.email, sub: user._id, role: user.role };


      return {
        user: user.toObject(),
        access_token: this.jwtService.sign(payload),
      };

    } catch (error: any) {
      // Return a custom error response in case of any exception
      if (error instanceof NotFoundException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new BadRequestException('Login failed. Please check your credentials and try again.', error.message);
    }
  }




}