import request from 'supertest';
import cookieParser from 'cookie-parser';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma.service';

describe('Auth Controller (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let session_id: string;
  let sessionCookie: string; // Variable to store the cookie string 'session_id=...'

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication({
      logger: false,
    });
    app.useLogger(false);
    app.use(cookieParser());

    await app.init();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  // --- Test Cases for Missing Body/Fields ---
  it('It should return 400 because body is missing', () => {
    return request(app.getHttpServer()).post('/auth/login').expect(400);
  });

  it('It should return 400 because username is missing', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({ password: '12345678' })
      .expect(400);
  });

  it('It should return 400 because password is missing', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: '23106050077' })
      .expect(400);
  });

  // --- Test Cases for Invalid Credentials ---
  it('It should return 401 because password is wrong', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: '23106050077', password: 'wrongpassword' })
      .expect(401);
  });

  it('It should return 401 because username does not exist', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'nonexistentuser', password: '12345678' })
      .expect(401);
  });

  // --- Test Case for Successful Login (Token and Cookie) ---
  it('should be able to login and receive token and cookie', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: '23106050077',
        password: '12345678',
      })
      .expect(200);

    // Ensure the response has the expected data structure (token)
    expect(res.body.data).toHaveProperty('session_id');
    expect(typeof res.body.data.session_id).toBe('string');
    expect(res.body.data.session_id.length).toBeGreaterThan(0);
    session_id = res.body.data.session_id;

    // We need the 'session_id=value' string for the Cookie header.
    const rawCookies = res.headers['set-cookie'];
    expect(rawCookies).toBeDefined();

    const cookies = Array.isArray(rawCookies) ? rawCookies : [rawCookies!];
    const sessionCookieHeader = cookies.find((cookie) =>
      cookie.startsWith('session_id='),
    );
    expect(sessionCookieHeader).toBeDefined();

    // The cookie for the next request is the part before the first semicolon.
    sessionCookie = sessionCookieHeader.split(';')[0];
    expect(sessionCookie).toContain('session_id=');
  });

  // --- Test Cases for Session Access (Token and Cookie) ---
  it('should be able to get a session with a valid token', () => {
    return request(app.getHttpServer())
      .get('/auth/session')
      .set('Authorization', `Bearer ${session_id}`)
      .expect(200);
  });

  it('should be able to get a session with a valid cookie', () => {
    // Make sure login test has run and set the cookie
    expect(sessionCookie).toBeDefined();

    return request(app.getHttpServer())
      .get('/auth/session')
      .set('Cookie', sessionCookie) // Now sends the correct 'session_id=value' format
      .expect(200); // A valid cookie should result in a 200 OK
  });

  it('should return 401 when getting session without token or cookie', () => {
    return request(app.getHttpServer()).get('/auth/session').expect(401);
  });

  it('should return 401 when getting session with an invalid token', () => {
    return request(app.getHttpServer())
      .get('/auth/session')
      .set('Authorization', 'Bearer invalidsessionid')
      .expect(401);
  });

  it('should return 401 when getting session with an invalid cookie', () => {
    return request(app.getHttpServer())
      .get('/auth/session')
      .set('Cookie', 'session_id=invalidcookie')
      .expect(401);
  });

  // --- Test Cases for Logout (Token and Cookie) ---
  it('should be able to log out and clear the cookie', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', `Bearer ${session_id}`)
      .expect(200);

    // Check that the cookie is cleared
    const rawCookies = res.headers['set-cookie'];
    expect(rawCookies).toBeDefined();

    const cookies = Array.isArray(rawCookies) ? rawCookies : [rawCookies!];
    const clearedCookieHeader = cookies[0];
    expect(clearedCookieHeader).toMatch(/session_id=;/);
    // **FIXED**: Changed assertion to check for 'Expires' attribute,
    // which is how Express's `clearCookie` works by default.
    expect(clearedCookieHeader).toMatch(/Expires/);
  });

  it('should return 401 when trying to access session after logout', () => {
    return request(app.getHttpServer())
      .get('/auth/session')
      .set('Authorization', `Bearer ${session_id}`)
      .expect(401);
  });

  it('should return 401 when trying to access session with the logged-out cookie', () => {
    return request(app.getHttpServer())
      .get('/auth/session')
      .set('Cookie', sessionCookie) // Use the original cookie
      .expect(401);
  });

  it('should return 401 when trying to log out again with the same token', () => {
    return request(app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', `Bearer ${session_id}`)
      .expect(401);
  });
});
