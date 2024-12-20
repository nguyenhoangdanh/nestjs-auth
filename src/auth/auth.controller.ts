import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { LocalAuthGuard } from './guards/local-auth/local-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

    @Post('register')
    registerUser(@Body() createUser: CreateUserDto) {
      return this.authService.registerUser(createUser);
    }

    @UseGuards(LocalAuthGuard)
    @Post('login')
    loginUser(){}
    // loginUser(@Request() req) {
    //   // return this.authService.loginUser(user);
    // }
}
