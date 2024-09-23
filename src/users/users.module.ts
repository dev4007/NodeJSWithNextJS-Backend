import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserController } from './users.controller';
import { UserService, } from './users.service';
import { User, UserSchema } from './users.model';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    JwtModule.register({
      secret: process.env.JWT_SECRET, // Use your JWT secret from the .env file
      signOptions: {  }, // Set your token expiration
    }),
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService], // Export the service if you want to use it in other modules
})
export class UserModule { }
