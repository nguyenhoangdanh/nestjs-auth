import {
  Controller,
  Get,
  Param,
  Delete,
  Request,
  UseGuards,
  Response,
} from '@nestjs/common';
import { SessionService } from './session.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth/jwt-auth.guard';
import { HTTPSTATUS } from 'src/auth/config/http.config';

@UseGuards(JwtAuthGuard)
@Controller('session')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Get('/all')
  async getAllSessions(@Request() req, @Response() res) {
    const userId = req.user.userId;
    const sessionId = req.sessionId;
    const { sessions } = await this.sessionService.getAllSessions(userId);

    const modifiedSessions = sessions.map((session) => ({
      ...session,
      ...(session.id === sessionId && { isCurrent: true }),
    }));

    return res.status(HTTPSTATUS.OK).json({
      message: 'Retrieved all sessions successfully',
      sessions: modifiedSessions,
    });
  }

  @Get()
  async getSession(@Request() req, @Response() res) {
    const sessionId = req.sessionId;
    if (!sessionId) {
      return res.status(HTTPSTATUS.NOT_FOUND).json({
        message: 'Session not found',
      });
    }
    const { session } = await this.sessionService.getOneSession(sessionId);
    return res.status(HTTPSTATUS.OK).json({
      message: 'Retrieved session successfully',
      session,
    });
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    const userId = req.user.userId;
    return this.sessionService.deleteSession(id, userId);
  }
}
