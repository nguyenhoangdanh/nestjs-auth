declare global {
  namespace Express {
    interface User extends User {}
    interface Request {
      sessionId?: number;
    }
  }
}
