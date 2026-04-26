import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    // Vérifie si l'email est déjà pris
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Cet email est déjà utilisé');
    }

    // Hashe le mot de passe avant stockage
    const hash = await bcrypt.hash(dto.password, 12);

    // Crée l'utilisateur en base
    const user = await this.prisma.user.create({
      data: { email: dto.email, password: hash },
      select: { id: true, email: true, createdAt: true },
    });

    // Génère et retourne directement un token — l'utilisateur est connecté après inscription
    return this.signToken(user.id, user.email);
  }

  async login(dto: LoginDto) {
    // Cherche l'utilisateur par email
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    // Même message d'erreur que le mot de passe soit faux ou l'email inexistant
    // → empêche l'énumération d'utilisateurs
    if (!user) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.password);

    if (!passwordMatch) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    return this.signToken(user.id, user.email);
  }

  private signToken(userId: string, email: string) {
    const payload = { sub: userId, email };

    return {
      accessToken: this.jwt.sign(payload),
    };
  }
}
