
import { ApiProperty } from '@nestjs/swagger';
import { CreateUserDto } from 'src/users/dto/create-user.dto';


export class RegisterDto extends CreateUserDto {
    @ApiProperty({ example: 'newuser@example.com' })
    declare email: string;

    @ApiProperty({ example: 'SecureP@$$wOrd123' })
    declare password: string;

    @ApiProperty({ example: 'John', required: false })
    declare firstName?: string;

    @ApiProperty({ example: 'Doe', required: false })
    declare lastName?: string;
}