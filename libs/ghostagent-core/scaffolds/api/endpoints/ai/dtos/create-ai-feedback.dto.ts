export class CreateAiFeedbackDto {
  public assistantReply: string;
  public comment?: string;
  public model?: string;
  public query: string;
  public rating: 'down' | 'up';
  public sessionId: string;
}
