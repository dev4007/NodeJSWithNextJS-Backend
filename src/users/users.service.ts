import { Injectable, NotFoundException } from '@nestjs/common';
import { UpdateUserDto } from './users.dto'; // Adjust the import path as necessary

import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './users.model';

@Injectable()
export class UserService {
    constructor(@InjectModel(User.name) private userModel: Model<User>) { }
    async getAll(): Promise<User[]> {
        return await this.userModel.find(); // Fetch all users from the database
    }
    async updateUser(id: string, updateUserDto: UpdateUserDto): Promise<User> {
        const user = await this.userModel.findById(id);
        if (!user) {
            throw new NotFoundException('User not found');
        }
        // Update user fields with the provided data
        Object.assign(user, updateUserDto);
        //Save the updated user
        return await user.save();
    }

    async getById(id: string): Promise<User> {
        const user = await this.userModel.findById(id);
        if (!user) {
            throw new NotFoundException('User not found');
        }
        return user;
    }

    async delete(id: string): Promise<{ message: string }> {
        const user = await this.userModel.findByIdAndDelete(id);
        if (!user) {
            throw new NotFoundException('User not found');
        }
        return { message: 'User deleted successfully' };
    }
}
