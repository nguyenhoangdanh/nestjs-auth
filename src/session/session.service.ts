import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllSessions(userId: string) {
    const sessions = await this.prisma.session.findMany({
      where: {
        userId: userId,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        userId: true,
        userAgent: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return {
      sessions,
    };
  }

  async getOneSession(sessionId: string) {
    const session = await this.prisma.session.findUnique({
      where: {
        id: sessionId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
    return {
      session,
    };
  }

  async deleteSession(id: string, userId: string) {
    await this.prisma.session.delete({
      where: {
        id: id,
        userId: userId,
      },
    });
    return {
      message: 'Session deleted successfully',
    };
  }
}
