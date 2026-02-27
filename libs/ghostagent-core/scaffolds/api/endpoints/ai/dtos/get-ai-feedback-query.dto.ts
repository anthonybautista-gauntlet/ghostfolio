export class GetAiFeedbackQueryDto {
  public rating?: 'down' | 'up';
  public skip?: number;
  public take?: number;
}
