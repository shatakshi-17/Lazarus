import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class SimulateOptionsDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  source_id?: string;
}
