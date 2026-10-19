# BeeOps — Thiết kế Backend

Hệ thống quản lý đơn hàng nội bộ của Bee Transportation Corporation.
Backend là **một service duy nhất**, chỉ dùng PostgreSQL.

| | |
|---|---|
| **Phiên bản** | Bản thiết kế v1 — 22/08/2026 |
| **Đặc tả nghiệp vụ** | Đề xuất BeeOps (bản final 21/08/2026), 8 nhóm tính năng F1–F8 |
| **Schema DB** | `beeops-db/schema.sql` — PostgreSQL, 10 bảng |
| **Quy mô** | Vài chục người dùng, ~vài nghìn đơn/năm |

**Mục lục**

1. [Vì sao một service](#1-vì-sao-một-service)
2. [Stack](#2-stack)
3. [Cấu trúc thư mục](#3-cấu-trúc-thư-mục)
4. [Bootstrap](#4-bootstrap-maints)
5. [Quy ước code](#5-quy-ước-code)
6. [Phân quyền & scope dữ liệu](#6-phân-quyền--scope-dữ-liệu)
7. [Xác thực](#7-xác-thực)
8. [Module đơn hàng](#8-module-orders--trung-tâm)
9. [Module phân phối & báo giá](#9-module-quotes--phân-phối--báo-giá-cạnh-tranh)
10. [Module tiến độ](#10-module-milestones)
11. [Module thông báo](#11-module-notifications-f8)
12. [Module dashboard](#12-module-dashboard-f6)
13. [Module trao đổi & file](#13-module-collab--bình-luận--file)
14. [Module quản trị tổ chức](#14-module-quản-trị-tổ-chức-f7)
15. [Danh sách API](#15-danh-sách-api)
16. [Prisma & cơ sở dữ liệu](#16-prisma--cơ-sở-dữ-liệu)
17. [Biến môi trường](#17-biến-môi-trường)
18. [Cron & email](#18-cron--email)
19. [Ghi audit](#19-ghi-audit)
20. [Hạ tầng & triển khai](#20-hạ-tầng--triển-khai)
21. [Kiểm thử](#21-kiểm-thử)
22. [Lộ trình](#22-lộ-trình)
23. [Checklist review](#23-checklist-review)

---

## 1. Vì sao một service

- Chỉ có một loại client: web nội bộ. Không có app mobile, không có API cho bên thứ ba.
- Vài chục người dùng đồng thời — không có domain nào cần scale riêng.
- Đặc tả đã chốt hạ tầng: *"cloud instance — một máy chủ chạy web + cơ sở dữ liệu
  tập trung"*.
- Mọi nghiệp vụ đều xoay quanh một bảng `orders`. Tạo đơn phải đồng thời sinh mã đơn
  và phân phối tới các phòng; chốt đơn phải đồng thời khóa doanh thu và sinh bộ mốc.
  Tách service sẽ biến những `BEGIN…COMMIT` này thành distributed transaction — trả
  giá lớn để giải quyết một vấn đề không tồn tại.

**Kết luận:** một NestJS app, nhiều module. Giữ ranh giới module rõ ràng để sau này
tách được nếu thật sự cần, nhưng không trả giá cho microservice ngay từ đầu.

---

## 2. Stack

| Thành phần | Chọn |
|---|---|
| Framework | NestJS 10 + Fastify adapter |
| Ngôn ngữ | TypeScript strict, `no-explicit-any` là lỗi ESLint |
| ORM / DB | Prisma 5 + PostgreSQL 16 — nguồn sự thật duy nhất |
| Xác thực | Passport JWT trong cookie httpOnly |
| Log | nestjs-pino |
| API docs | Swagger tại `/api/docs` |
| Validation | class-validator + class-transformer |
| Cron | @nestjs/schedule |
| Email | nodemailer qua SMTP công ty |
| File | @fastify/multipart, lưu trên đĩa |
| Excel / PDF | exceljs / pdfkit |
| Test | Jest + ts-jest, `*.spec.ts` co-located |

**Cố ý không dùng**

| Không dùng | Lý do |
|---|---|
| Redis | Không cần cache ở quy mô này. Hàng đợi email nằm trong bảng `notifications` |
| MongoDB | `activity_log` là bảng PostgreSQL |
| Message queue (RabbitMQ, BullMQ) | `FOR UPDATE … SKIP LOCKED` trên PostgreSQL là đủ |
| Object storage (S3, GCS) | File nằm trên đĩa của VM, backup cùng với DB |
| Kubernetes / serverless | Một VM chạy docker-compose |
| i18n | Giao diện chỉ tiếng Việt |

Backend chạy được với **hai container**: app và PostgreSQL — không có hàng đợi, cache
hay object storage nào phải quản trị thêm. Bản triển khai đầy đủ (§20) thêm hai
container hạ tầng nữa: frontend tĩnh và reverse proxy.

---

## 3. Cấu trúc thư mục

```
beeops-backend/
├── prisma/
│   ├── schema.prisma            # sinh từ beeops-db/schema.sql
│   ├── migrations/
│   └── seed.ts                  # 10 dịch vụ + bộ mốc + tài khoản admin đầu tiên
├── src/
│   ├── main.ts                  # bootstrap — xem §4
│   ├── app.module.ts            # imports [CommonModule, ...11 module]
│   ├── health.controller.ts
│   ├── common/                  # thứ gì ≥2 module dùng chung thì nằm ở đây
│   │   ├── common.module.ts     # @Global — export Prisma, Config, Mail, Scope
│   │   ├── prisma/prisma.service.ts
│   │   ├── config/env.validation.ts     # Joi schema — mọi biến env khai ở đây
│   │   ├── guards/              # jwt-auth.guard.ts, roles.guard.ts,
│   │   │                        # company-report.guard.ts, must-change-password.guard.ts
│   │   ├── decorators/          # current-user, public, roles
│   │   ├── interceptors/        # transform.interceptor.ts
│   │   ├── filters/             # http-exception.filter.ts
│   │   ├── scope/               # scope.service.ts, money.visibility.ts  ← §6
│   │   ├── mail/                # mail.service.ts, templates.ts
│   │   ├── storage/             # storage.service.ts
│   │   ├── activity/            # activity.service.ts
│   │   ├── dto/                 # base-response.dto.ts, pagination.dto.ts
│   │   ├── enums/               # index.ts — Role, OrderStatus, DeptState, NotifType
│   │   └── types/               # authenticated-user.type.ts
│   └── modules/
│       ├── auth/
│       ├── departments/
│       ├── users/
│       ├── services/            # danh mục 10 dịch vụ + bộ mốc + SLA
│       ├── customers/
│       ├── orders/
│       ├── quotes/              # phân phối F2 + báo giá F3
│       ├── milestones/
│       ├── collab/              # comments + files
│       ├── notifications/
│       └── dashboard/
├── uploads/                     # file đính kèm (mount volume, nằm ngoài image)
├── test/
├── .env.example
├── docker-compose.yml
├── Dockerfile
└── package.json
```

Mỗi module theo cùng một khuôn:

```
modules/<feature>/
  <feature>.module.ts
  <feature>.controller.ts       # tách controller khi vai trò phân kỳ rõ
  <feature>.service.ts
  services/                     # sub-service khi service chính quá dài
  dto/
    <action>.dto.ts             # DTO request
    responses.dto.ts            # DTO response
    index.ts                    # barrel
  <feature>.service.spec.ts
```

**Nguyên tắc đặt code**

- Logic domain nằm ở module sở hữu nó.
- Thứ gì ≥2 module dùng chung thì đưa vào `src/common/` và export từ barrel.
- Module **không** import vào `src/` của module khác — dùng chung qua `common` hoặc
  qua database.
- Import bằng path alias `@/common/...` (khai trong `tsconfig.json`), không dùng đường
  dẫn tương đối xuyên thư mục.

---

## 4. Bootstrap (`main.ts`)

Thứ tự các global **có ý nghĩa** — giữ đúng thứ tự này.

```typescript
const app = await NestFactory.create<NestFastifyApplication>(
  AppModule,
  new FastifyAdapter({ logger: false, bodyLimit: 25 * 1024 * 1024 }),
);

app.useLogger(app.get(Logger));                       // nestjs-pino
await app.register(fastifyCookie, { secret: cookieSecret });
await app.register(fastifyMultipart, { limits: { fileSize: 20 * 1024 * 1024 } });

app.useGlobalPipes(new ValidationPipe({
  transform: true, whitelist: true, forbidNonWhitelisted: true,
}));

app.enableCors({ origin: FRONTEND_ORIGIN, credentials: true });   // cần cho cookie
app.enableShutdownHooks();

SwaggerModule.setup('api/docs', app,
  SwaggerModule.createDocument(app, new DocumentBuilder()
    .setTitle('BeeOps — Internal Operations API')
    .setVersion('1.0').addCookieAuth('access_token').addServer('/api').build()));

app.setGlobalPrefix('api');
app.useGlobalFilters(new HttpExceptionFilter());
app.useGlobalInterceptors(new TransformInterceptor());
const reflector = app.get(Reflector);
app.useGlobalGuards(
  new JwtAuthGuard(reflector),
  new RolesGuard(reflector),
  new MustChangePasswordGuard(reflector),
);

await app.listen(parseInt(process.env.PORT || '8080', 10), '0.0.0.0');
```

**Hệ quả cần nhớ**

- `JwtAuthGuard` là global → **mọi route đều yêu cầu đăng nhập**. Muốn mở thì gắn
  `@Public()`. Không gắn lại `@UseGuards(JwtAuthGuard)` — thừa.
- `forbidNonWhitelisted` bật global → field lạ trong body bị **reject 400**. Phải khai
  đủ mọi field trong DTO, không nhận object rời.
- `credentials: true` bắt buộc vì token nằm trong cookie chứ không phải header.
- `bodyLimit` nâng lên cho file đính kèm (chứng từ, bản vẽ, ảnh POD).

---

## 5. Quy ước code

### Controller — mỏng, không chứa logic

```typescript
@ApiTags('Orders')
@Controller('orders')                       // kebab-case, không có tiền tố 'api'
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết đơn hàng' })
  @ApiResponse({ status: 200, type: OrderDetailResponseDto })
  detail(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OrderDetailResponseDto> {
    return this.ordersService.detail(id, user);
  }
}
```

- Chỉ DI qua constructor (`private readonly`). Không service locator, không `new`
  thủ công cho injectable.
- Mọi endpoint có `@ApiOperation({ summary })` + `@ApiResponse({ status, type })`.
- Danh tính người gọi lấy từ `@CurrentUser()`. **Không bao giờ tin `userId` hay `role`
  trong body.**
- Trả thẳng DTO. **Không** tự dựng `{ success, data }`.

### Vỏ response — dựng tập trung

```jsonc
// thành công — TransformInterceptor bọc
{ "success": true, "data": {…},
  "meta": { "timestamp": "2026-08-22T03:11:07.383Z", "path": "/api/orders/12" } }

// lỗi — HttpExceptionFilter bọc
{ "success": false,
  "error": { "code": "Conflict", "message": "…", "statusCode": 409 },
  "meta": { … } }
```

Lỗi thì `throw` exception của Nest với thông điệp tiếng Việt:

```typescript
throw new BadRequestException('Giá trị đơn hàng phải lớn hơn 0');
throw new NotFoundException('Không tìm thấy đơn hàng');
throw new ForbiddenException('Bạn không có quyền xem báo cáo công ty');
throw new ConflictException('Đơn này đã được chốt');
```

Không `return res.status(...)`, không nuốt lỗi thành `{ success: false }`, không
`console.log` lỗi — để nó throw và Pino ghi lại.

### DTO

Mỗi request/response một class. Field nào cũng có **cả** decorator Swagger **lẫn**
class-validator. Bắt buộc dùng `!` cho field bắt buộc, `@IsOptional()` + `?` cho
tùy chọn.

```typescript
export class CreateQuoteDto {
  @ApiProperty({ description: 'Giá trị đơn hàng (VND)', example: 45000000 })
  @IsInt() @Min(1)
  amount!: number;

  @ApiPropertyOptional({ description: 'Bao gồm / không bao gồm' })
  @IsOptional() @IsString() @MaxLength(1000)
  scopeNote?: string;

  @ApiPropertyOptional({ description: 'Hiệu lực báo giá' })
  @IsOptional() @IsDateString()
  validUntil?: string;
}
```

### Prisma

Dùng `findUniqueOrThrow` hoặc `NotFoundException` tường minh thay vì trả null im lặng.
Type include/select bằng namespace Prisma, không `any`:

```typescript
const ORDER_DETAIL_INCLUDE = {
  service: true,
  customer: true,
  departments: { include: { department: true, assignee: true } },
  milestones: { orderBy: { seq: 'asc' } },
} satisfies Prisma.OrderInclude;
```

### Đặt tên & định dạng

- File kebab-case: `*.controller.ts`, `*.service.ts`, `*.module.ts`, `*.dto.ts`,
  `*.guard.ts`, `*.decorator.ts`, `*.spec.ts`.
- Class: `XxxController`, `XxxService`, `XxxModule`. DTO request `XxxDto`, response
  `XxxResponseDto`, danh sách `XxxListResponseDto`.
- Controller path kebab-case (`@Controller('order-departments')`), không kèm `api/`.
- Prettier: single quote, trailing comma `all`, `printWidth: 100`, có semicolon.

---

## 6. Phân quyền & scope dữ liệu

Đây là phần khó nhất của BeeOps. Đặc tả tách rõ hai trục và **không được trộn**:

> Vai trò quyết định **được làm gì**. Phạm vi (scope) quyết định **thấy dữ liệu của ai**.

Cộng trục thứ ba mà đặc tả nhấn mạnh riêng: **doanh thu** là dữ liệu nhạy cảm nhất,
có luật hiển thị riêng, không suy ra được từ hai trục kia.

### 6.1. Ba tầng kiểm soát

| Tầng | Câu hỏi | Cơ chế | Sai thì hậu quả |
|---|---|---|---|
| **Route** | Được gọi endpoint này không? | `RolesGuard` + `@Roles()` | 403 — thấy ngay |
| **Hàng** | Thấy những dòng nào? | `ScopeService` → `Prisma.where` | Lộ đơn phòng khác |
| **Cột** | Trong dòng đó, thấy cột nào? | Serializer theo vai trò | Lộ doanh thu |

Ba tầng phải cùng đúng. Guard đúng mà scope sai thì sale A xem được đơn của sale B
qua chính endpoint hợp lệ của mình — và không ai phát hiện cho tới khi muộn.

### 6.2. Vai trò

`users.roles` là `text[]` — một người kiêm nhiều vai trò, **quyền là hợp của các
vai trò**.

```typescript
// src/common/enums/index.ts
export enum Role {
  ADMIN   = 'admin',    // Quản trị tổ chức, danh mục
  LEADER  = 'leader',   // Ban lãnh đạo — chỉ xem, toàn công ty
  MANAGER = 'manager',  // Trưởng phòng
  SALE    = 'sale',
  STAFF   = 'staff',    // Nhân viên phòng ban
}
```

`RolesGuard` kiểm tra **giao** của hai mảng:

```typescript
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      ctx.getHandler(), ctx.getClass(),
    ]);
    if (!required?.length) return true;
    const { user } = ctx.switchToHttp().getRequest<RequestWithUser>();
    return required.some((r) => user?.roles.includes(r));
  }
}
```

**Không thêm lớp permission map.** BeeOps chỉ có 9 hành động phân biệt được bằng vai
trò — `@Roles()` là đủ. Thêm một lớp ánh xạ role → permission chỉ tạo ra hai chỗ phải
sửa mỗi khi đổi luật.

| Hành động | Decorator |
|---|---|
| Tạo phòng ban / nhân viên / cấu hình dịch vụ | `@Roles(Role.ADMIN)` |
| Tạo đơn hàng | `@Roles(Role.ADMIN, Role.SALE)` |
| Nhận đơn / gửi báo giá / bỏ qua | `@Roles(Role.MANAGER, Role.STAFF)` |
| So sánh báo giá, chọn báo giá thắng | `@Roles(Role.SALE)` |
| Chốt / hủy đơn | `@Roles(Role.ADMIN, Role.SALE)` |
| Cập nhật tiến độ thực hiện | `@Roles(Role.MANAGER, Role.STAFF)` |
| Dashboard công ty | `CompanyReportGuard` (xem dưới) |
| Dashboard phòng | `@Roles(Role.ADMIN, Role.LEADER, Role.MANAGER)` |
| Xem danh sách / chi tiết đơn | không giới hạn vai trò — **scope lo phần còn lại** |

Dashboard có hai guard mà `@Roles` không diễn tả được, vì cả hai đều phụ thuộc cờ cấp
lẻ `canViewCompanyReport`:

```typescript
// Chỉ tầng công ty — dùng cho endpoint phơi số liệu toàn công ty
@Injectable()
export class CompanyReportGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const { user } = ctx.switchToHttp().getRequest<RequestWithUser>();
    if (!isCompanyWide(user))                 // dùng chung hàm với §6.3
      throw new ForbiddenException('Bạn không có quyền xem báo cáo công ty');
    return true;
  }
}
```

Guard thứ hai — `AggregateReportGuard`, cho các endpoint so sánh giữa phòng/nhân viên —
ở §15. Nó **chặn tầng cá nhân** chứ không **chỉ cho tầng công ty**, vì trưởng phòng
phải xem được hiệu suất phòng mình.

### 6.3. `ScopeService` — trái tim của phân quyền dữ liệu

`GET /orders` là **một** endpoint nhưng trả về 5 tập dữ liệu khác nhau. Nếu mỗi service
tự viết điều kiện lọc thì sớm muộn cũng có chỗ quên. Giải pháp: một service duy nhất
sinh mệnh đề `where` của Prisma, mọi truy vấn đơn hàng **bắt buộc** đi qua nó.

Điều kiện "nhìn thấy toàn công ty" xuất hiện ở **bốn chỗ** (lọc đơn, tầng dashboard,
hiển thị doanh thu, báo giá kín). Khai đúng một lần, ở ngoài class để cả hàm thuần lẫn
service đều dùng chung:

```typescript
// src/common/scope/is-company-wide.ts
export function isCompanyWide(user: AuthenticatedUser): boolean {
  return user.roles.includes(Role.ADMIN)
      || user.roles.includes(Role.LEADER)
      || user.canViewCompanyReport;      // cờ cấp lẻ Admin bật cho từng người
}
```

```typescript
// src/common/scope/scope.service.ts
@Injectable()
export class ScopeService {
  /** Điều kiện lọc đơn hàng theo phạm vi quyền của người gọi. */
  orderWhere(user: AuthenticatedUser): Prisma.OrderWhereInput {
    if (isCompanyWide(user)) return {};

    const or: Prisma.OrderWhereInput[] = [];

    // Sale: đơn do mình tạo
    if (user.roles.includes(Role.SALE)) or.push({ createdBy: user.id });

    // Trưởng phòng: mọi đơn phòng mình tham gia
    if (user.roles.includes(Role.MANAGER) && user.departmentId)
      or.push({ departments: { some: { departmentId: user.departmentId } } });

    // Nhân viên: đơn mình xử lý + hàng đợi phòng
    if (user.roles.includes(Role.STAFF) && user.departmentId)
      or.push({ departments: { some: {
        OR: [{ assigneeId: user.id }, { departmentId: user.departmentId }],
      } } });

    // Không khớp vai trò nào có scope -> không thấy gì
    return or.length ? { OR: or } : { id: -1 };
  }

  /** Phạm vi thống kê của dashboard. */
  reportScope(user: AuthenticatedUser): ReportScope {
    if (isCompanyWide(user)) return { level: 'company' };

    // Tầng cá nhân KHÔNG đồng nghĩa với "đơn mình tạo".
    // Sale tạo đơn; nhân viên phòng ban không bao giờ tạo đơn, họ XỬ LÝ đơn.
    return {
      level: user.roles.includes(Role.MANAGER) && user.departmentId
        ? 'department' : 'personal',
      departmentId: user.roles.includes(Role.MANAGER) ? user.departmentId : undefined,
      createdBy:    user.roles.includes(Role.SALE)    ? user.id : undefined,
      assigneeId:   user.roles.includes(Role.STAFF)   ? user.id : undefined,
    };
  }
}

type ReportScope = {
  level: 'company' | 'department' | 'personal';
  departmentId?: number;      // các vế dưới đây là HỢP (OR), không loại trừ nhau
  createdBy?: number;
  assigneeId?: number;
};
```

Ba điểm phải giữ kỷ luật:

- **`{ id: -1 }` chứ không phải `{}`.** Vai trò lạ hoặc thiếu `departmentId` phải ra
  rỗng, không phải ra tất cả. Mặc định an toàn, không mặc định mở.
- **`canViewCompanyReport` phải có mặt ở cả `orderWhere` lẫn `reportScope`.** Nếu chỉ
  đưa vào `reportScope`, kế toán trưởng xem được biểu đồ toàn công ty nhưng bấm vào
  `/dashboard/drill` ra rỗng và `GET /orders` cũng rỗng — biểu đồ không drill-down
  được. Cờ này chỉ mở **quyền đọc**; nó không kèm bất kỳ vai trò hành động nào.
- **`reportScope` phải hợp các vế giống hệt `orderWhere`, không dùng ưu tiên
  "khớp cái đầu là dừng".** Trưởng phòng kiêm sale tạo một đơn thuộc dịch vụ mà phòng
  mình không phụ trách: `orderWhere` thấy đơn đó (vế `createdBy`), nhưng nếu
  `reportScope` trả về `{level:'department'}` rồi dừng thì dashboard **không** đếm nó.
  Danh sách đơn và dashboard lệch nhau, người dùng thấy đơn nhưng không thấy doanh thu
  của chính mình. `level` chỉ dùng để quyết định *hiển thị tầng nào*; các vế lọc luôn
  được `OR` với nhau.
- **Mọi query trên `order` đều `AND` với `orderWhere()`**, kể cả khi lấy chi tiết.
  Đọc chi tiết viết là:

```typescript
const order = await this.prisma.order.findFirst({
  where: { AND: [{ id }, this.scope.orderWhere(user)] },
  include: ORDER_DETAIL_INCLUDE,
});
if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
```

Trả **404 chứ không 403** — trả 403 là gián tiếp xác nhận đơn đó tồn tại, sale A biết
được sale B vừa tạo đơn nào.

### 6.4. Tầng cột — luật hiển thị doanh thu

Đặc tả chốt rõ: **sale không xem được doanh thu phòng, chỉ xem doanh thu các đơn của
chính mình**; nhân viên *"thấy giá trị từng đơn mình xử lý, không có dashboard tổng
hợp"*. Nghĩa là hai người cùng gọi `GET /orders/12` nhận về số cột khác nhau.

`orders.finalAmount` **chính là báo giá của phòng thắng**. Vì vậy luật hiển thị nó
phải chặt bằng luật báo giá kín ở §6.5 — nếu không, phòng thua chỉ cần mở lại đơn là
biết giá phòng thắng đã chào bao nhiêu.

```typescript
// src/common/scope/money.visibility.ts
export function canSeeOrderAmount(user: AuthenticatedUser, order: OrderRow): boolean {
  // Toàn công ty — dùng chung hàm với §6.3, không chép lại điều kiện
  if (isCompanyWide(user)) return true;

  // Sale phụ trách đơn — đây là đơn của chính mình
  if (order.createdBy === user.id) return true;

  // CHỈ phòng thắng. Phòng tham gia rồi thua KHÔNG được thấy,
  // vì finalAmount = giá phòng thắng đã chào.
  if (user.departmentId && order.departmentId === user.departmentId) return true;

  return false;
}
```

Trong `OrdersService.toDto()`:

```typescript
return { ...base, finalAmount: canSeeOrderAmount(user, order) ? order.finalAmount : null };
```

Ba hệ quả cần nhớ:

- Phòng thua vẫn thấy **báo giá của chính mình** (`orderDepartment.amount` — đó là số
  họ tự nhập), chỉ không thấy `finalAmount`.
- Trước khi chốt, `finalAmount` là `null` với mọi người — không có gì để lộ.
- Trưởng phòng của phòng thắng thấy `finalAmount`, đúng đặc tả *"thấy giá trị từng đơn
  mình xử lý"*.

Kèm quy tắc bất di bất dịch: **DTO response không bao giờ trải nguyên bản ghi Prisma**
(`return { ...order }`). Luôn map tường minh từng field. Một `include` vô ý là đủ để
lộ `passwordHash` hoặc giá của phòng khác.

**Và mọi đường ra khác của dữ liệu cũng phải qua `canSeeOrderAmount`**, không chỉ JSON:

| Đường ra | Rủi ro nếu quên |
|---|---|
| `GET /orders/export` (Excel) | Cột doanh thu của mọi đơn trong bộ lọc — lộ hàng loạt, một lần bấm |
| `GET /dashboard/export` | Số liệu tổng hợp ngoài phạm vi quyền |
| `GET /orders/:id/confirmation.pdf` | Giá chốt trên phiếu xác nhận |
| Email (§18) | Hộp thư không tôn trọng phân quyền — nên **không bao giờ** nhét tiền vào email |

Đây là chỗ dễ sót nhất vì ba đường đầu **không đi qua DTO** — chúng dựng file từ kết
quả truy vấn thô. Bộ sinh Excel/PDF phải nhận `user` và gọi cùng một hàm
`canSeeOrderAmount` cho từng dòng; không có `finalAmount` thì để ô trống, không phải
số 0.

### 6.5. Báo giá kín

Mặc định: nhiều phòng cùng báo giá một đơn thì **mỗi phòng chỉ thấy báo giá của mình**.
Chỉ sale phụ trách đơn và vai trò cấp trên thấy tất cả. Đây là lọc **hàng** trên
`order_departments`, không phải lọc cột:

```typescript
// Dùng CHUNG một điều kiện với §6.3 và §6.4 — lệch nhau là sinh lỗ hổng.
const canSeeAll = isCompanyWide(user) || order.createdBy === user.id;

const rows = await this.prisma.orderDepartment.findMany({
  where: { orderId, ...(canSeeAll ? {} : { departmentId: user.departmentId ?? -1 }) },
  include: { department: true, assignee: true },
  orderBy: { amount: 'asc' },
});
```

Trưởng phòng thấy báo giá của phòng mình — không thấy phòng khác, kể cả khi phòng
mình đã thắng.

`isCompanyWide()` phải là **cùng một hàm** với §6.3, không viết lại tại chỗ. Bản trước
của tài liệu này liệt kê tay `[ADMIN, LEADER]` và quên `canViewCompanyReport`, khiến kế
toán trưởng xem được đơn và doanh thu nhưng bảng so sánh báo giá lại rỗng. Đúng kiểu
lỗi sinh ra từ việc chép điều kiện phân quyền thành hai bản.

*Chế độ "báo giá mở" là giai đoạn 2.* Khi làm, thêm biến cấu hình và đổi `canSeeAll`
thành `canSeeAll || quoteModeIsOpen`, không đụng gì khác.

---

## 7. Xác thực

Web nội bộ, không có mobile client → **JWT trong cookie httpOnly**, an toàn hơn trước
XSS và bỏ được bảng `sessions`.

```
POST /api/auth/login  { email, password }
  → Set-Cookie: access_token=<jwt>; HttpOnly; Secure; SameSite=Lax; Max-Age=43200
  → body: { user: {...}, mustChangePassword: boolean }
```

- Mật khẩu băm **bcrypt** (`bcrypt.hash(pw, 12)`), khớp với cột `password_hash`.
- Hạn token **12 giờ**, không refresh token. Hết hạn thì đăng nhập lại.
- **Payload chỉ có `{ sub }`.** Không nhét `roles`, `departmentId`,
  `canViewCompanyReport`, `mustChangePassword` vào token — xem ngay dưới.
- `JwtStrategy` đọc cookie: `jwtFromRequest: (req) => req.cookies?.access_token`,
  rồi `validate()` đọc người dùng từ database.

### Vì sao token không mang quyền

Toàn bộ §6 phụ thuộc vào 4 thuộc tính: `roles`, `departmentId`,
`canViewCompanyReport`, `isActive`. Nếu chúng nằm trong token thì **mọi thay đổi của
Admin đều trễ tới 12 giờ**:

| Admin làm gì | Hậu quả nếu quyền nằm trong token |
|---|---|
| Khóa tài khoản người nghỉ việc | Người đó vẫn dùng hệ thống bình thường tới nửa ngày |
| Thu hồi cờ "Xem báo cáo công ty" | Vẫn xem được doanh thu toàn công ty |
| Hạ vai trò trưởng phòng xuống nhân viên | Vẫn thấy đơn cả phòng |
| Chuyển nhân viên sang phòng khác | Vẫn thấy hàng đợi phòng cũ |

Ba dòng cuối là **rò rỉ dữ liệu**, không phải bất tiện. Với vài chục người dùng, đọc
lại một dòng `users` theo khóa chính mỗi request là chuyện không đáng bàn về hiệu năng:

```typescript
async validate(payload: { sub: number }): Promise<AuthenticatedUser> {
  const u = await this.prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, email: true, fullName: true, roles: true, departmentId: true,
              canViewCompanyReport: true, mustChangePassword: true, isActive: true },
  });
  if (!u?.isActive) throw new UnauthorizedException();   // khóa có hiệu lực NGAY
  return u;
}
```

Đổi lại, bảng `sessions` vẫn không cần: thu hồi quyền đi qua `users`, còn hạn đăng
nhập đi qua hạn của token.

**`mustChangePassword`** bật khi Admin cấp mật khẩu tạm. FE thấy cờ này thì ép chuyển
màn đổi mật khẩu; BE chặn cứng bằng `MustChangePasswordGuard` (global, §4) — mọi route
trả **403** khi cờ còn bật, trừ những route gắn `@SkipPasswordCheck()`:
`/auth/change-password`, `/auth/logout`, `/auth/me`.

Guard phải **bỏ qua route `@Public()`** — lúc đó chưa có `user` để mà kiểm tra:

```typescript
canActivate(ctx: ExecutionContext): boolean {
  if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [ctx.getHandler(), ctx.getClass()]))
    return true;
  if (this.reflector.getAllAndOverride<boolean>(SKIP_PASSWORD_CHECK, [ctx.getHandler(), ctx.getClass()]))
    return true;
  const { user } = ctx.switchToHttp().getRequest<RequestWithUser>();
  if (user?.mustChangePassword)
    throw new ForbiddenException('Bạn cần đổi mật khẩu trước khi sử dụng hệ thống');
  return true;
}
```

Cờ này **đọc từ database mỗi request** (§7), không nằm trong token — nên đổi mật khẩu
xong là có hiệu lực ngay, không cần cấp lại cookie. Đây chính là lợi ích thứ hai của
việc để token chỉ mang `sub`.

---

## 8. Module `orders` — trung tâm

### 8.1. Tạo đơn (F1 + F2 trong một transaction)

Chỗ dễ sai nhất. Ba việc phải **cùng thành công hoặc cùng thất bại**: sinh mã đơn,
ghi đơn, phân phối tới các phòng.

```typescript
async create(dto: CreateOrderDto, user: AuthenticatedUser): Promise<OrderDetailResponseDto> {
  const result = await this.prisma.$transaction(async (tx) => {
    // 1. Lấy ngày MỘT LẦN từ database, rồi truyền vào cả ba chỗ dùng nó.
    //    Không để mỗi chỗ tự gọi current_date, và không lấy ngày từ Node —
    //    ngày trong mã đơn phải là ngày của PostgreSQL (xem cảnh báo múi giờ §17).
    const [{ today }] = await tx.$queryRaw<{ today: Date }[]>`SELECT current_date AS today`;

    // STT trong ngày — hàm SQL đã có advisory lock bên trong
    const [{ no }] = await tx.$queryRaw<{ no: number }[]>`
      SELECT next_daily_no(${dto.serviceId}::int, ${today}::date) AS no`;
    const [{ code }] = await tx.$queryRaw<{ code: string }[]>`
      SELECT order_code(${dto.serviceId}::int, ${today}::date, ${no}::int) AS code`;

    // 2. Tra bảng định tuyến TRƯỚC khi tạo đơn, để ghi đúng trạng thái ngay lần đầu.
    //    Tạo 'distributed' rồi update về 'new' là hai lần ghi và là một chuyển
    //    trạng thái không có trong ALLOWED (§8.3).
    const depts = await tx.department.findMany({
      where: { isActive: true, serviceIds: { has: dto.serviceId } },
      select: { id: true, managerId: true },
    });

    const created = await tx.order.create({
      data: { ...mapDto(dto), code, dailyNo: no, orderDay: today, createdBy: user.id,
              status: depts.length ? 'distributed' : 'new' },   // 'new' = chưa định tuyến
    });

    if (depts.length)
      await tx.orderDepartment.createMany({
        data: depts.map((d) => ({ orderId: created.id, departmentId: d.id })),
      });

    await this.activity.log(tx, { orderId: created.id, entity: 'orders',
      entityId: String(created.id), action: 'create', actorId: user.id });
    return { created, depts };
  });

  // 3. Thông báo NGOÀI transaction
  await this.notifications.notifyNewOrder(result);
  return this.detail(result.created.id, user);
}
```

Ba điều bắt buộc:

- **Advisory lock nằm trong `next_daily_no()`**, tự nhả khi transaction kết thúc.
  Không tự `SELECT MAX(daily_no) + 1` ở tầng ứng dụng — hai sale bấm cùng lúc sẽ
  trùng mã.
- **Lấy `current_date` một lần rồi truyền đi**, thay vì để `next_daily_no()`,
  `order_code()` và `DEFAULT current_date` của cột `order_day` mỗi chỗ tự gọi. Trong
  cùng một transaction thì ba lần gọi cho cùng kết quả, nhưng dựa vào điều đó là dựa
  vào một chi tiết ngầm của PostgreSQL; ghi tường minh thì đọc code là thấy ngay ngày
  nào đang được dùng.
- **Không gửi thông báo bên trong transaction.** SMTP chậm hoặc timeout sẽ giữ khóa
  và rollback cả đơn hàng.
- Dịch vụ chưa có phòng phụ trách thì đơn **vẫn được tạo**, trạng thái `new`, vào
  hàng đợi "Chưa định tuyến" cho Admin — và `notifyNewOrder` phải bắn cho **Admin**
  chứ không phải cho phòng ban (không có phòng nào để bắn).

### 8.2. Chốt đơn (F4)

```typescript
async close(orderId: number, dto: CloseOrderDto, user: AuthenticatedUser): Promise<void> {
  await this.prisma.$transaction(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
    assertTransition(order.status, 'closed');       // §8.3 — không bỏ qua bước này

    // Phòng phụ trách đã chốt ở bước select-quote (§9.3). KHÔNG nhận lại từ body:
    // nhận lại là mở đường chốt đơn cho một phòng chưa từng được chọn.
    if (!order.departmentId)
      throw new ConflictException('Đơn chưa chọn báo giá thắng');

    const won = await tx.orderDepartment.findUniqueOrThrow({
      where: { orderId_departmentId: { orderId, departmentId: order.departmentId } },
    });
    if (!won.amount) throw new BadRequestException('Phòng này chưa gửi báo giá');

    // Khóa doanh thu — COPY sang orders, không tham chiếu
    await tx.order.update({ where: { id: orderId }, data: {
      status: 'closed', finalAmount: won.amount,
      closedAt: new Date(), closeNote: dto.note,
    }});

    // Sinh mốc tiến độ — SNAPSHOT, không phải tham chiếu
    await tx.$executeRaw`
      INSERT INTO order_milestones (order_id, seq, name)
      SELECT ${orderId}, m.seq, m.name
      FROM orders o JOIN services s ON s.id = o.service_id
      CROSS JOIN LATERAL unnest(s.milestones) WITH ORDINALITY AS m(name, seq)
      WHERE o.id = ${orderId}`;

    // Audit đi TRONG transaction (§19) — khác thông báo, cái đó đi ngoài
    await this.activity.log(tx, {
      orderId, entity: 'orders', entityId: String(orderId),
      action: 'close', actorId: user.id,
      detail: { status: [order.status, 'closed'],
                finalAmount: [null, won.amount.toString()] },
    });
  });

  // Ngoài transaction — báo phòng phụ trách triển khai
  await this.notifications.notifyOrderClosed(orderId);
}
```

`CloseOrderDto` chỉ còn `{ note?: string }`. Không nhận `departmentId`, không nhận
`amount` — cả hai đều lấy từ dữ liệu đã có trên server.

**Vì sao copy `finalAmount` thay vì join sang `order_departments.amount`:** giá chốt
là con số pháp lý với khách. Phòng sửa báo giá sau khi chốt thì doanh thu đã ghi nhận
không được đổi theo. Cùng lý do với việc copy bộ mốc — Admin sửa mẫu thì đơn đã chốt
phải giữ nguyên.

Đơn dừng ở **`closed`** (Đã chốt), *không* nhảy thẳng sang `in_progress`. Hai trạng
thái này là hai việc khác nhau trong đặc tả: chốt là xong với khách, đang thực hiện là
phòng đã bắt tay làm. Đơn chuyển sang `in_progress` khi phòng phụ trách cập nhật mốc
tiến độ **đầu tiên** (§10).

### 8.3. Vòng đời trạng thái

```
                    ┌──────────────── mở lại vòng giá ───────────────┐
                    │                                               │
  new ──> distributed ──> quoting ──> awaiting_selection ──> awaiting_customer
   ▲           │             │                 │                  │     │
   │           └─────────────┴─── settleCheck ─┘                  │     └──> closed
 chưa                                                             │            │
 định            (cả 3 trạng thái này đều đi thẳng ──> rejected)   │            ▼
 tuyến                                                            │      in_progress
                                                                  │            │
                                                                  ▼            ▼
                                                              rejected     completed

  cancelled  ← từ bất kỳ trạng thái nào chưa kết thúc, kèm lý do bắt buộc
```

Sơ đồ chỉ để nhìn tổng thể; **bảng bên dưới mới là đặc tả chuẩn** — có gì lệch thì tin
bảng và `ALLOWED`.

Mười trạng thái, ba trong đó là trạng thái kết thúc: `completed`, `rejected`,
`cancelled`. Đơn đã kết thúc thì không chuyển đi đâu được nữa.

**`rejected` tách khỏi `cancelled` — không được gộp.** Đặc tả phân biệt rõ: *từ chối*
là khách nói không (kèm lý do: giá, thời gian, chọn đối thủ) — đây là dữ liệu đầu vào
của win rate; *hủy* là ngoại lệ nội bộ (nhập nhầm, khách hủy nhu cầu, đơn trùng). Gộp
hai cái sẽ làm hỏng chỉ số win rate ở F6 vì mẫu số bị thổi phồng bởi những đơn chưa
bao giờ ra tới khách.

**Ai đẩy trạng thái nào** — mọi bước đều có chủ, không có bước nào "tự nhiên xảy ra":

| Từ → đến | Ai / khi nào | Chỗ trong code |
|---|---|---|
| `new` → `distributed` | Admin gán phòng cho đơn chưa định tuyến | `POST /orders/:id/departments` |
| (tạo đơn) → `distributed` | Hệ thống, khi có ≥1 phòng phụ trách | `OrdersService.create` (§8.1) |
| (tạo đơn) → `new` | Hệ thống, khi **không** phòng nào phụ trách | `OrdersService.create` (§8.1) |
| `distributed` → `quoting` | **Báo giá đầu tiên** của bất kỳ phòng nào | `QuotesService.quote` (§9.1) |
| `distributed` / `quoting` → `awaiting_selection` | Hệ thống, khi **mọi phòng đã `quoted` hoặc `passed`** | `QuotesService.settleCheck` (§9.1) |
| `awaiting_selection` → `quoting` | Admin thêm phòng mới vào đơn — không còn "mọi phòng đã trả lời" | `POST /orders/:id/departments` |
| `quoting` / `awaiting_selection` → `awaiting_customer` | Sale chọn báo giá thắng | `POST /orders/:id/select-quote` |
| `awaiting_selection` → `quoting` | Sale yêu cầu điều chỉnh **trước khi chọn** | `POST /orders/:id/request-revision` |
| `awaiting_customer` → `quoting` | Khách yêu cầu điều chỉnh **sau khi chọn** — mở lại vòng giá | `POST /orders/:id/request-revision` |
| `awaiting_customer` → `closed` | Sale bấm Chốt sau khi khách đồng ý | `POST /orders/:id/close` |
| `quoting` / `awaiting_selection` / `awaiting_customer` → `rejected` | Khách từ chối, kèm lý do | `POST /orders/:id/reject` |
| `closed` → `in_progress` | Phòng phụ trách cập nhật mốc **đầu tiên** | `MilestonesService.update` (§10) |
| `in_progress` → `completed` | Không còn mốc `pending` | `MilestonesService.update` (§10) |
| bất kỳ trạng thái **chưa kết thúc** → `cancelled` | Sale/Admin hủy, **bắt buộc kèm lý do** | `POST /orders/:id/cancel` |

`quoting → awaiting_customer` được phép trực tiếp: nếu một phòng im lặng mãi không
báo giá cũng không bỏ qua, sale vẫn phải chọn được trong số các báo giá đã có.
`awaiting_selection` do đó là trạng thái **thông tin** — "mọi phòng đã trả lời, đến
lượt sale" — chứ không phải cổng bắt buộc.

`rejected` với tới được từ `quoting` và `awaiting_selection` chứ không chỉ từ
`awaiting_customer`. Khách hoàn toàn có thể nói không ngay khi sale vừa chào giá qua
điện thoại, chưa kịp chọn phòng nào. Nếu chỉ cho `rejected` từ `awaiting_customer` thì
những ca đó buộc phải ghi là `cancelled` — và **mất luôn khỏi mẫu số win rate**, đúng
cái sai mà việc tách `rejected` khỏi `cancelled` sinh ra để tránh.

Chuyển trạng thái tập trung một chỗ, không rải `update({ status })` khắp nơi:

```typescript
// orders/order-state.helper.ts
const ALLOWED: Record<OrderStatus, OrderStatus[]> = {
  new:                ['distributed', 'cancelled'],
  // distributed -> awaiting_selection: don chi co 1 phong phu trach, phong do bao gia
  // xong la moi phong da tra loi. Thieu nhanh nay thi settleCheck nem 409 o ca pho bien nhat.
  distributed:        ['quoting', 'awaiting_selection', 'cancelled'],
  // 'rejected' phải với tới được từ cả 3 trạng thái có khách trong cuộc: khách có thể
  // nói không ngay khi sale vừa chào giá, chưa kịp chọn phòng nào.
  quoting:            ['awaiting_selection', 'awaiting_customer', 'rejected', 'cancelled'],
  awaiting_selection: ['awaiting_customer', 'quoting', 'rejected', 'cancelled'],
  awaiting_customer:  ['closed', 'rejected', 'quoting', 'cancelled'],
  closed:             ['in_progress', 'cancelled'],
  in_progress:        ['completed', 'cancelled'],
  completed: [], rejected: [], cancelled: [],
};
export function assertTransition(from: OrderStatus, to: OrderStatus): void {
  if (!ALLOWED[from].includes(to))
    throw new ConflictException(`Không thể chuyển đơn từ "${from}" sang "${to}"`);
}
```

**Mọi thay đổi `status` phải đi qua `assertTransition`** — kể cả `close()`, kể cả
`cancel()`. Đây là mục 8 của checklist review (§23).

### 8.4. Danh sách & chi tiết (F5)

- `GET /orders` — phân trang, bộ lọc: trạng thái, phòng ban, người phụ trách, khách
  hàng, dịch vụ, tuyến, khoảng thời gian; tìm theo mã đơn hoặc tên khách. `where`
  luôn `AND` với `scope.orderWhere(user)`.
- `GET /orders/kanban` — cùng bộ lọc, gom theo `status`, mỗi cột giới hạn 50 dòng.
- `GET /orders/:id` — chi tiết + dòng thời gian từ `activity_log`.
- `GET /orders/export` — Excel theo đúng bộ lọc hiện tại (exceljs, stream về client).

---

## 9. Module `quotes` — phân phối & báo giá cạnh tranh

Thao tác trên bảng `order_departments`.

| Endpoint | Ai | Việc |
|---|---|---|
| `.../claim` | Staff | Tự nhận đơn → `state = claimed` |
| `.../assign` | Manager | Gán cho nhân viên |
| `.../pass` | Manager, Staff | Bỏ qua, **bắt buộc kèm lý do** |
| `.../quote` | Manager, Staff | Gửi / cập nhật báo giá |

### 9.1. Gửi báo giá — đẩy bản cũ xuống lịch sử

```sql
UPDATE order_departments SET
  quote_history = CASE WHEN quote_version = 0 THEN quote_history
    ELSE quote_history || jsonb_build_object(
      'version', quote_version, 'amount', amount, 'scope_note', scope_note,
      'lead_time', lead_time, 'at', last_quoted_at) END,
  quote_version   = quote_version + 1,
  amount = $1, scope_note = $2, lead_time = $3, valid_until = $4,
  state = 'quoted',
  first_quoted_at = COALESCE(first_quoted_at, now()),
  last_quoted_at  = now()
WHERE order_id = $5 AND department_id = $6;
```

`first_quoted_at` giữ nguyên lần đầu — đây là mốc tính chỉ số *"thời gian đến báo giá
đầu tiên"* ở dashboard. `last_quoted_at` mới là lần cập nhật gần nhất. Trộn hai cái
làm hỏng chỉ số ngay khi có báo giá v2.

Ngay sau mỗi lần `quote` hoặc `pass`, gọi `settleCheck` để đẩy trạng thái đơn — đây là
chỗ duy nhất đẩy `distributed → quoting → awaiting_selection`:

```typescript
private async settleCheck(tx: Tx, orderId: number): Promise<void> {
  const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
  if (!['distributed', 'quoting'].includes(order.status)) return;   // đã đi xa hơn

  const rows = await tx.orderDepartment.findMany({
    where: { orderId }, select: { state: true },
  });
  const settled = rows.every((r) => r.state === 'quoted' || r.state === 'passed');
  const anyQuote = rows.some((r) => r.state === 'quoted');

  // MỌI phòng đều bỏ qua -> bế tắc, không có gì để chọn. Báo người xử lý tay.
  if (settled && !anyQuote) {
    await this.notifications.notifyAllPassed(tx, orderId);   // sale + Admin
    return;                                                  // giữ nguyên trạng thái
  }

  // Mọi phòng đã trả lời và có ít nhất một báo giá -> đến lượt sale
  const next = settled ? 'awaiting_selection'
             : anyQuote ? 'quoting'
             : order.status;
  if (next === order.status) return;

  assertTransition(order.status, next);
  await tx.order.update({ where: { id: orderId }, data: { status: next } });
}
```

Nhánh **mọi phòng đều `passed`** phải nằm **trước** phép tính `next`. Nếu để sau, hàm
đã `return` vì `next === order.status` và thông báo không bao giờ được bắn — đơn nằm
im trong `distributed` mà không ai biết.

### 9.2. Đơn giá tham khảo

Hiển thị cho phòng ban khi nhập giá: 5 đơn thành công gần nhất, xếp theo độ khớp.

```sql
SELECT o.code, o.final_amount, o.closed_at, o.origin_province, o.destination_province,
       (CASE WHEN o.origin_province      = $2 THEN 2 ELSE 0 END)
     + (CASE WHEN o.destination_province = $3 THEN 2 ELSE 0 END)
     + (CASE WHEN $4::numeric IS NOT NULL AND o.weight_kg
                BETWEEN $4 * 0.7 AND $4 * 1.3 THEN 1 ELSE 0 END)
     + (CASE WHEN $5::numeric IS NOT NULL AND o.volume_cbm
                BETWEEN $5 * 0.7 AND $5 * 1.3 THEN 1 ELSE 0 END) AS match_score
FROM orders o
WHERE o.service_id = $1 AND o.final_amount IS NOT NULL
  AND o.status IN ('closed','in_progress','completed')
ORDER BY match_score DESC, o.closed_at DESC LIMIT 5;
```

Chỉ khớp theo **trường số cố định**, tuyệt đối không đụng `orders.note` — đây là
quyết định số 6 của đặc tả.

### 9.3. Chọn báo giá thắng & yêu cầu điều chỉnh

`POST /orders/:id/select-quote { departmentId, reason? }` — chỉ sale phụ trách đơn.
Chấp nhận đơn đang ở `quoting` **hoặc** `awaiting_selection`, chuyển sang
`awaiting_customer`. Phòng được chọn phải có `amount` — chọn phòng chưa báo giá thì **400**.

Đặc tả nói rõ: *"phòng thắng thành phòng phụ trách chính thức; các phòng khác nhận
thông báo kết thúc"* — việc này xảy ra **ngay ở bước chọn**, không đợi tới lúc chốt:

```typescript
await tx.order.update({ where: { id: orderId },
  data: { status: 'awaiting_customer', departmentId: dto.departmentId } });

await tx.orderDepartment.updateMany({
  where: { orderId, state: 'quoted' }, data: { state: 'lost' } });   // 'passed' giữ nguyên
await tx.orderDepartment.update({
  where: { orderId_departmentId: { orderId, departmentId: dto.departmentId } },
  data: { state: 'won' } });
```

**Chưa** ghi `finalAmount` — doanh thu chỉ được khóa khi khách đồng ý và sale bấm Chốt
(§8.2). Trước lúc đó `finalAmount` là `null` nên không ai thấy con số nào, kể cả phòng
thắng.

### Mở lại vòng giá — phải hoàn tác việc chọn

`POST /orders/:id/request-revision { departmentIds[], reason }` ghi vào `comments` với
`kind = 'revision_request'`, bắn thông báo, và đưa đơn về `quoting`. Gọi được ở hai
thời điểm, và **thời điểm sau bắt buộc phải hoàn tác**:

| Gọi từ | Việc phải làm |
|---|---|
| `awaiting_selection` — sale ép giá trước khi chọn | Chỉ đổi trạng thái |
| `awaiting_customer` — khách yêu cầu điều chỉnh sau khi đã chọn | Đổi trạng thái **+ `departmentId = null` + trả `won`/`lost` về `quoted`** |

```typescript
if (order.status === 'awaiting_customer') {
  await tx.order.update({ where: { id: orderId }, data: { departmentId: null } });
  await tx.orderDepartment.updateMany({
    where: { orderId, state: { in: ['won', 'lost'] } }, data: { state: 'quoted' } });
}
```

Quên bước hoàn tác này thì đơn quay lại `quoting` nhưng vẫn mang một phòng phụ trách và
một phòng `won` từ vòng trước — vòng giá mới chạy trên dữ liệu bẩn, và
`canSeeOrderAmount` (§6.4) cấp quyền xem doanh thu cho một phòng chưa chắc còn thắng.

---

## 10. Module `milestones`

`PATCH /orders/:id/milestones/:milestoneId` với `{ status, note?, fileIds? }`.

- Chỉ phòng phụ trách (`orders.departmentId`) mới cập nhật được — kiểm tra trong
  service, không phải bằng `@Roles`.
- `status = 'skipped'` **bắt buộc** có `note` (đặc tả: *"được bỏ qua mốc không áp
  dụng kèm ghi chú"*).
- Mốc đi tuần tự: không cho `done` mốc `seq = n` khi mốc `seq < n` còn `pending`.
- **Mốc cuối không được `skipped`.** Đặc tả: *"Mốc cuối luôn là Nghiệm thu — thời điểm
  đơn chuyển sang Hoàn thành"*. Cho phép bỏ qua nghiệm thu là cho phép đóng đơn mà
  không ai xác nhận đã giao hàng.

**Module này sở hữu hai bước chuyển trạng thái đơn**, cả hai đều qua `assertTransition`:

```typescript
// sau khi cập nhật mốc — LUÔN đọc lại trạng thái hiện tại, không hardcode vế 'from'
let current = order.status;

if (current === 'closed') {                              // mốc ĐẦU TIÊN được xử lý
  assertTransition(current, 'in_progress');
  await tx.order.update({ where: { id }, data: { status: 'in_progress' } });
  current = 'in_progress';
}

const remaining = await tx.orderMilestone.count({ where: { orderId: id, status: 'pending' } });
if (remaining === 0 && current === 'in_progress') {
  assertTransition(current, 'completed');
  await tx.order.update({ where: { id },
    data: { status: 'completed', completedAt: new Date() } });
}
```

Truyền **biến** `current` vào `assertTransition`, không viết cứng `'in_progress'` làm
vế `from`. Viết cứng thì hàm luôn so đúng cặp mình vừa gõ và **không kiểm tra gì cả** —
đơn đã `completed` mà có ai đó sửa lại một mốc thì vẫn lọt qua.

Đơn một mốc duy nhất (dịch vụ CON chẳng hạn, nếu Admin rút gọn) sẽ đi
`closed → in_progress → completed` trong cùng một request — đúng, không phải lỗi.

---

## 11. Module `notifications` (F8)

Ghi thông báo là việc phụ, **không bao giờ được làm hỏng việc chính**:

```typescript
async push(rows: NotificationInput[]): Promise<void> {
  try {
    await this.prisma.notification.createMany({ data: rows });
  } catch (e) {
    this.logger.error({ err: e }, 'Ghi thông báo thất bại');   // nuốt, không throw
  }
}
```

Email không gửi trực tiếp trong request. Ghi vào bảng với `emailed_at = NULL`, cron
quét ra gửi:

```typescript
@Cron(MAIL_FLUSH_CRON)
async flushEmails(): Promise<void> {
  // BƯỚC 1 — nhận việc TRONG transaction. Khóa chỉ sống tới lúc COMMIT,
  // nên phải đánh dấu emailed_at ngay trong chính transaction này.
  const claimed = await this.prisma.$transaction(async (tx) => {
    // Lấy MỌI dòng chưa xử lý, kể cả dòng sẽ không gửi — xem giải thích bên dưới.
    const rows = await tx.$queryRaw<PendingMail[]>`
      SELECT n.id, n.title, n.body, n.type, u.email,
             (u.is_active AND NOT (n.type = ANY (u.email_off))) AS should_send
      FROM notifications n JOIN users u ON u.id = n.user_id
      WHERE n.emailed_at IS NULL
      ORDER BY n.created_at LIMIT 50
      FOR UPDATE OF n SKIP LOCKED`;
    if (rows.length)
      await tx.notification.updateMany({
        where: { id: { in: rows.map((r) => r.id) } },
        data: { emailedAt: new Date() },     // đánh dấu ĐÃ XỬ LÝ, không phải "đã gửi"
      });
    return rows;
  });

  // BƯỚC 2 — gửi SMTP NGOÀI transaction. Chậm mấy cũng không giữ khóa DB.
  for (const r of claimed.filter((r) => r.should_send)) {
    try { await this.mail.send(r); }
    catch (e) { this.logger.error({ err: e, id: r.id }, 'Gửi email thất bại'); }
  }
}
```

Hai cách viết sai làm `SKIP LOCKED` **hoàn toàn vô tác dụng**:

- **Chạy `$queryRaw` ngoài transaction.** Prisma autocommit từng câu lệnh, khóa nhả
  ngay khi query trả về — hai lần cron chạy chồng nhau lấy đúng cùng một tập dòng và
  gửi email hai lần.
- **Gửi SMTP bên trong transaction.** Đúng về mặt chống trùng nhưng giữ khóa suốt thời
  gian gọi mạng, vi phạm chính luật ở §8.1.

Cách trên chọn ngữ nghĩa **at-most-once**: đánh dấu trước, gửi sau. Email lỗi thì mất,
chỉ còn dòng log — chấp nhận được vì thông báo in-app mới là kênh chính, email chỉ là
kênh nhắc. Muốn at-least-once thì thêm cột `email_attempts int` và chỉ set `emailed_at`
sau khi gửi thành công.

**Lọc `email_off` ở bước gửi, không ở bước nhận việc.** Nếu đưa
`NOT (n.type = ANY (u.email_off))` vào mệnh đề `WHERE` của câu claim thì những dòng bị
tắt email **không bao giờ được chọn**, `emailed_at` mãi mãi `NULL`, và chúng tích tụ
vĩnh viễn trong index một phần `WHERE emailed_at IS NULL`. Hộp thư đi không bao giờ
cạn: mỗi lần cron chạy lại quét qua đống rác đó, và đống rác chỉ lớn dần. Cùng vấn đề
với người dùng đã bị khóa (`is_active = false`).

Vì vậy `emailed_at` mang nghĩa **"cron đã xử lý xong dòng này"**, không phải "email đã
được gửi". Muốn phân biệt hai thứ thì thêm cột `email_sent boolean`.

**Loại thông báo** (14 loại, khớp với `NotificationType` trong `common/enums`):

| Loại | Bắn cho | Khi nào |
|---|---|---|
| `new_order` | Phòng phụ trách (hoặc **Admin** nếu chưa định tuyến) | Đơn được phân phối |
| `assigned` | Nhân viên | Trưởng phòng gán đơn |
| `quote_received` | Sale | Một phòng gửi báo giá |
| `all_passed` | Sale + Admin | Mọi phòng đều bỏ qua — bế tắc (§9.1) |
| `revision_requested` | Phòng liên quan | Sale/khách yêu cầu điều chỉnh giá |
| `quote_won` / `quote_lost` | Phòng | Sale chọn báo giá thắng (§9.3) |
| `order_closed` | Phòng phụ trách | Sale bấm Chốt |
| `order_rejected` | Phòng phụ trách; **nếu chưa chọn phòng nào thì bắn cho mọi phòng đang tham gia** | Khách từ chối (§8.3 — từ chối được từ 3 trạng thái) |
| `order_cancelled` | Phòng liên quan | Đơn bị hủy |
| `milestone_updated` | Sale | Phòng cập nhật tiến độ |
| `sla_late` | Trưởng phòng + sale | Quá hạn tiếp nhận — **có `dedupe_key`** |
| `quote_expired` | Sale | Báo giá quá `valid_until` — **có `dedupe_key`** |
| `mention` | Người được nhắc | `@mention` trong bình luận |

**"Việc của tôi"** — `GET /notifications/my-tasks`: đơn đang chờ chính mình hành động,
sắp xếp theo độ khẩn. Không phải bảng riêng, là truy vấn tổng hợp:

| Vai trò | Đang chờ mình |
|---|---|
| Sale | đơn `awaiting_selection` mình tạo; đơn `quoting` đã có ≥1 báo giá và quá hạn SLA của mọi phòng; đơn `awaiting_customer` quá 2 ngày |
| Manager | đơn `pending` trong hàng đợi phòng, chưa gán ai |
| Staff | đơn `claimed` gán cho mình mà chưa báo giá; mốc tiến độ đến hạn |

---

## 12. Module `dashboard` (F6)

Tính trực tiếp từ `orders` bằng `GROUP BY`, **không bảng tổng hợp, không materialized
view** — vài nghìn đơn/năm thì `SUM` trên index chạy dưới 10ms.

Mọi endpoint gọi `scope.reportScope(user)` rồi dựng mệnh đề lọc. `level` chỉ quyết
định **hiển thị tầng nào** trên UI; các vế lọc thì **`OR`** với nhau, đúng như
`orderWhere` ở §6.3 — hai chỗ lệch nhau là danh sách đơn và dashboard đá nhau.

| Vế | Điều kiện |
|---|---|
| `level === 'company'` | không lọc gì |
| `departmentId` | `o.department_id = :deptId OR EXISTS (od WHERE od.order_id = o.id AND od.department_id = :deptId)` |
| `createdBy` | `o.created_by = :userId` |
| `assigneeId` | `EXISTS (od WHERE od.order_id = o.id AND od.assignee_id = :userId)` |

```typescript
function reportFilter(s: ReportScope): Prisma.Sql {
  if (s.level === 'company') return Prisma.sql`true`;

  const parts: Prisma.Sql[] = [];
  if (s.departmentId) parts.push(Prisma.sql`(o.department_id = ${s.departmentId}
      OR EXISTS (SELECT 1 FROM order_departments od
                 WHERE od.order_id = o.id AND od.department_id = ${s.departmentId}))`);
  if (s.createdBy)    parts.push(Prisma.sql`o.created_by = ${s.createdBy}`);
  if (s.assigneeId)   parts.push(Prisma.sql`EXISTS (SELECT 1 FROM order_departments od
                          WHERE od.order_id = o.id AND od.assignee_id = ${s.assigneeId})`);

  if (!parts.length) return Prisma.sql`false`;         // an toàn mặc định
  return Prisma.join(parts, ' OR ');
}
```

Hai cái bẫy ở hàm này:

- Lọc tầng cá nhân **chỉ bằng `created_by`** thì dashboard của mọi nhân viên phòng ban
  luôn rỗng — họ không bao giờ tạo đơn, họ xử lý đơn. Đặc tả nói rõ nhân viên *"thấy
  giá trị từng đơn mình xử lý"*.
- Vế `departmentId` phải tính **cả đơn phòng chỉ tham gia báo giá** chứ không chỉ đơn
  phòng thắng. Nếu chỉ so `o.department_id` thì các chỉ số vận hành (thời gian tiếp
  nhận, tỷ lệ thắng báo giá) mất sạch phần đơn phòng đã bỏ công báo giá rồi thua —
  tức là mất đúng phần mẫu số cần để tính tỷ lệ thắng.

Riêng nhóm chỉ số **doanh thu** thì ngược lại: chỉ tính đơn phòng **thắng**
(`o.department_id = :deptId`), vì doanh thu chỉ thuộc về phòng thực hiện. Hai nhóm chỉ
số dùng hai mệnh đề khác nhau — đừng dùng chung một hàm cho cả hai.

**Nhóm chỉ số doanh thu:** doanh thu theo ngày/tháng/quý + so sánh cùng kỳ; lát cắt
theo dịch vụ / tuyến / khách hàng / sale / phòng ban; giá trị đơn trung bình; win rate
và phân tích lý do từ chối.

**Định nghĩa win rate** — chỗ này phải chốt vì `rejected` và `cancelled` là hai thứ
khác nhau:

```
win rate = số đơn (closed | in_progress | completed)
         ─────────────────────────────────────────────────────
           số đơn (closed | in_progress | completed | rejected)
```

`cancelled` **nằm ngoài cả tử số lẫn mẫu số**: đơn nhập nhầm, đơn trùng, khách hủy nhu
cầu — những thứ chưa bao giờ ra tới bàn đàm phán. Đưa chúng vào mẫu số sẽ làm win rate
tụt xuống một cách vô nghĩa. Đơn đang chạy (`new`, `distributed`, `quoting`,
`awaiting_selection`, `awaiting_customer`) cũng nằm ngoài — chưa có kết quả.

**Nhóm chỉ số vận hành:** phễu số đơn theo trạng thái; thời gian phản hồi
(`distributed_at → claimed_at`, `distributed_at → first_quoted_at`); số đơn trễ SLA;
số phòng tham gia trung bình mỗi đơn; tỷ lệ thắng báo giá theo phòng; khối lượng đơn
theo phòng / nhân viên.

Biểu đồ bấm vào được → mỗi endpoint thống kê có endpoint `/dashboard/drill` song song
trả danh sách đơn phía sau con số, dùng chung bộ lọc.

---

## 13. Module `collab` — bình luận & file

**Bình luận** tách luồng theo `department_id`. Luật hiển thị luồng phải khai đủ cho cả
5 vai trò, không để trống vai trò nào:

| Ai | Thấy luồng nào |
|---|---|
| `isCompanyWide()` (Admin, Ban lãnh đạo, người có cờ báo cáo) | Tất cả |
| Sale phụ trách đơn | Tất cả |
| Trưởng phòng / nhân viên | Luồng phòng mình + luồng chung (`department_id IS NULL`) |
| Người khác | Không thấy đơn, nên không tới được đây (scope §6.3 chặn trước) |

Đây là **cùng một luật với báo giá kín** (§6.5) — trao đổi giá cả nằm trong bình luận,
để lộ luồng của phòng khác cũng là để lộ báo giá. `mentions int[]` sinh thông báo
`mention`; chỉ @mention được người **có quyền xem luồng đó**, nếu không thì thông báo
dẫn tới một trang 404.

**File** lưu trên đĩa, DB giữ metadata trong `orders.files` / `order_milestones.files`:

```typescript
// StorageService — src/common/storage
save(file: MultipartFile, orderId: number): Promise<FileMeta>
// uploads/2026/08/<orderId>/<uuid>.<ext>
```

- Đường dẫn sinh bằng UUID, **không dùng tên file người dùng gửi lên** (chống path
  traversal). Tên gốc chỉ lưu trong jsonb để hiển thị.
- Tải về **không** phục vụ tĩnh. Đi qua `GET /files/:orderId/:fileId`, kiểm tra scope
  rồi mới stream. File chứng từ khách hàng không được để ai có link cũng tải.
- Whitelist MIME: pdf, jpeg, png, webp, doc(x), xls(x). Giới hạn 20MB/file.

---

## 14. Module quản trị tổ chức (F7)

Ba module CRUD (`departments`, `users`, `services`), tất cả `@Roles(Role.ADMIN)`.
Bốn chỗ cần lưu ý:

- **Ma trận định tuyến** là `PUT /departments/:id/services { serviceIds: number[] }` —
  ghi đè cả mảng, không patch từng phần tử. Đúng với UI tick checkbox rồi Lưu.
  Thay đổi **chỉ áp cho đơn tạo sau đó**: `order_departments` đã sinh rồi thì giữ
  nguyên, giống hệt cách `services.milestones` không đụng tới đơn đã chốt. Bỏ một dịch
  vụ khỏi phòng **không** rút phòng đó khỏi các đơn đang chờ báo giá — nếu muốn rút thì
  phòng tự bấm "Bỏ qua" kèm lý do, để còn lưu vết.
- **Cảnh báo dịch vụ mồ côi** — `GET /services/unrouted` trả dịch vụ chưa phòng nào
  phụ trách. FE hiển thị ngay trên màn cấu hình, đúng đặc tả F2.
- **Ngừng hoạt động, không xóa.** `isActive = false` cho cả phòng ban và nhân viên;
  lịch sử đơn giữ nguyên tham chiếu. `DELETE` chỉ dùng cho danh mục chưa từng dùng.
- Sửa `services.milestones` chỉ ảnh hưởng đơn chốt **sau** đó. Response nên trả kèm
  câu nhắc để FE hiển thị cho Admin.

---

## 15. Danh sách API

Tiền tố toàn cục `/api`. Swagger tại `/api/docs`. Xác thực bằng cookie `access_token`.
Mọi route yêu cầu đăng nhập trừ `POST /auth/login` và `GET /health`.

Phân trang: `?page=1&limit=20&sortBy=createdAt&sortOrder=desc`. Response danh sách:
`{ items: [...], total, page, limit }`.

Cột **Scope** `✓` = ngoài `@Roles`, service còn bắt buộc lọc dữ liệu qua `ScopeService`.

### Auth

| Method | Path | Vai trò | Mô tả |
|---|---|---|---|
| POST | `/auth/login` | `@Public` | Đăng nhập, set cookie. Trả `{ user, mustChangePassword }` |
| POST | `/auth/logout` | mọi | Xóa cookie |
| GET | `/auth/me` | mọi | Vai trò, phòng ban, cờ báo cáo |
| POST | `/auth/change-password` | mọi | `{ currentPassword, newPassword }` |

### Quản trị tổ chức (F7) — tất cả `@Roles(ADMIN)`

| Method | Path | Mô tả |
|---|---|---|
| GET | `/departments` | Danh sách, lọc `?isActive=` |
| POST | `/departments` | `{ name, managerId?, serviceIds[] }` |
| GET | `/departments/:id` | Chi tiết + danh sách nhân viên |
| PATCH | `/departments/:id` | Sửa tên, trưởng phòng, trạng thái |
| PUT | `/departments/:id/services` | Ghi đè ma trận định tuyến |
| GET | `/users` | Lọc `?departmentId=&role=&isActive=&q=` |
| POST | `/users` | `{ email, fullName, phone?, departmentId?, roles[], tempPassword }` |
| GET | `/users/:id` | Chi tiết |
| PATCH | `/users/:id` | Thông tin, phòng ban, vai trò, cờ `canViewCompanyReport` |
| POST | `/users/:id/reset-password` | Cấp mật khẩu tạm |
| PATCH | `/users/:id/status` | `{ isActive }` — khóa/mở tài khoản |
| GET | `/services` | 10 dịch vụ + bộ mốc + SLA |
| GET | `/services/unrouted` | **Dịch vụ chưa phòng nào phụ trách** |
| POST | `/services` | `{ code, name, slaHours, milestones[] }` |
| PATCH | `/services/:id` | Tên, SLA, thứ tự, trạng thái |
| PUT | `/services/:id/milestones` | Ghi đè cả bộ mốc, theo thứ tự |

### Khách hàng (F1)

| Method | Path | Vai trò | Mô tả |
|---|---|---|---|
| GET | `/customers` | mọi | Tìm kiếm `?q=` — gợi ý khi tạo đơn |
| POST | `/customers` | `ADMIN, SALE` | Tạo hồ sơ khách |
| GET | `/customers/:id` | mọi | Chi tiết + số đơn. **`tongDoanhThu` chỉ trả khi `reportScope` là `company`/`department`**, ngược lại là `null` |
| PATCH | `/customers/:id` | `ADMIN, SALE` | Sửa |

### Đơn hàng (F1, F4, F5)

| Method | Path | Vai trò | Scope | Mô tả |
|---|---|---|---|---|
| POST | `/orders` | `ADMIN, SALE` | | Tạo đơn + sinh mã + phân phối tự động |
| GET | `/orders` | mọi | ✓ | Danh sách, phân trang, đầy đủ bộ lọc |
| GET | `/orders/kanban` | mọi | ✓ | Gom theo trạng thái |
| GET | `/orders/unrouted` | `ADMIN` | | Hàng đợi "Chưa định tuyến" |
| GET | `/orders/export` | mọi | ✓ | Xuất Excel theo bộ lọc hiện tại |
| GET | `/orders/:id` | mọi | ✓ | Chi tiết đầy đủ |
| GET | `/orders/:id/timeline` | mọi | ✓ | Dòng thời gian từ `activity_log` |
| PATCH | `/orders/:id` | `ADMIN, SALE` | ✓ | Sửa thông tin đơn. Sau khi chốt vẫn sửa được nhưng **bắt buộc có `note`** và luôn ghi `activity_log` (đặc tả F4). Không sửa được `finalAmount` |
| POST | `/orders/:id/close` | `ADMIN, SALE` | ✓ | **Chốt** — khóa doanh thu, sinh bộ mốc |
| POST | `/orders/:id/reject` | `ADMIN, SALE` | ✓ | Khách từ chối → **`rejected`**. `{ rejectReason, note }` — vào mẫu số win rate |
| POST | `/orders/:id/cancel` | `ADMIN, SALE` | ✓ | Hủy nội bộ → **`cancelled`**. Bắt buộc kèm lý do — **ngoài** win rate |
| GET | `/orders/:id/confirmation.pdf` | `ADMIN, SALE` | ✓ | Phiếu xác nhận đơn hàng |

Bộ lọc của `GET /orders`:

```
?status=&serviceId=&departmentId=&assigneeId=&customerId=&createdBy=
&originProvince=&destinationProvince=
&fromDate=&toDate=&dateField=created|closed|completed
# status: new | distributed | quoting | awaiting_selection | awaiting_customer
#         | closed | in_progress | completed | rejected | cancelled
&q=                                    # mã đơn hoặc tên khách
&page=&limit=&sortBy=&sortOrder=
```

### Phân phối & báo giá (F2, F3)

| Method | Path | Vai trò | Mô tả |
|---|---|---|---|
| GET | `/orders/:id/departments` | mọi | Tình trạng tiếp nhận + báo giá. **Lọc báo giá kín** |
| POST | `/orders/:id/departments/:deptId/claim` | `MANAGER, STAFF` | Tự nhận đơn |
| POST | `/orders/:id/departments/:deptId/assign` | `MANAGER` | `{ assigneeId }` |
| POST | `/orders/:id/departments/:deptId/pass` | `MANAGER, STAFF` | `{ reason }` |
| POST | `/orders/:id/departments/:deptId/quote` | `MANAGER, STAFF` | Gửi/cập nhật báo giá |
| POST | `/orders/:id/departments` | `ADMIN` | Thêm phòng ngoài cấu hình (`isManual`). Đơn ở `new` → `distributed`; đơn ở `awaiting_selection` → quay về `quoting` |
| GET | `/orders/:id/reference-prices` | `MANAGER, STAFF` | 5 đơn thành công khớp nhất |
| POST | `/orders/:id/select-quote` | `SALE` | `{ departmentId, reason? }` — từ `quoting` hoặc `awaiting_selection` |
| POST | `/orders/:id/request-revision` | `SALE` | `{ departmentIds[], reason }` |
| GET | `/queue` | `MANAGER, STAFF` | Hàng đợi phòng mình |

Body của `quote`:

```jsonc
{
  "amount": 45000000,
  "scopeNote": "Bao gồm bốc xếp 2 đầu, chưa gồm VAT",
  "leadTime": "3 ngày kể từ khi nhận hàng",
  "validUntil": "2026-09-05"
}
```

### Tiến độ, trao đổi, file

| Method | Path | Vai trò | Mô tả |
|---|---|---|---|
| GET | `/orders/:id/milestones` | mọi (scope ✓) | Bộ mốc của đơn |
| PATCH | `/orders/:id/milestones/:mid` | `MANAGER, STAFF` | `{ status, note?, fileIds? }` |
| GET | `/orders/:id/comments` | mọi (scope ✓) | Lọc theo luồng được xem |
| POST | `/orders/:id/comments` | mọi (scope ✓) | `{ body, departmentId?, mentions[] }` |
| POST | `/orders/:id/files` | mọi (scope ✓) | multipart — trả `FileMeta` |
| GET | `/files/:orderId/:fileId` | mọi (scope ✓) | **Stream có kiểm tra quyền** |
| DELETE | `/orders/:id/files/:fileId` | người upload, `ADMIN` | Xóa file |

### Thông báo (F8)

| Method | Path | Mô tả |
|---|---|---|
| GET | `/notifications` | Hộp thư, `?isRead=` |
| GET | `/notifications/unread-count` | Badge |
| POST | `/notifications/read` | `{ ids[] }` hoặc `{ all: true }` |
| GET | `/notifications/my-tasks` | **"Việc của tôi"** |
| GET | `/notifications/preferences` | Loại nào đang tắt email |
| PUT | `/notifications/preferences` | `{ emailOff: string[] }` |

### Dashboard (F6)

| Method | Path | Vai trò | Mô tả |
|---|---|---|---|
| GET | `/dashboard/summary` | mọi | Doanh thu tháng, số đơn, win rate, đơn trễ SLA |
| GET | `/dashboard/revenue` | mọi | `?groupBy=day\|month\|quarter&compare=true` |
| GET | `/dashboard/revenue/by` | mọi | `?dimension=service\|route\|customer\|sale\|department` |
| GET | `/dashboard/funnel` | mọi | Số đơn theo trạng thái |
| GET | `/dashboard/win-rate` | mọi | Tỷ lệ chốt + lý do từ chối |
| GET | `/dashboard/response-time` | `AggregateReportGuard` | Thời gian tiếp nhận, báo giá |
| GET | `/dashboard/competition` | `AggregateReportGuard` | Số phòng tham gia TB, tỷ lệ thắng |
| GET | `/dashboard/workload` | `AggregateReportGuard` | Khối lượng theo phòng / nhân viên |
| GET | `/dashboard/drill` | mọi | Danh sách đơn phía sau một điểm biểu đồ |
| GET | `/dashboard/export` | mọi | Xuất Excel |

Có thể ép hẹp hơn bằng `?departmentId=` / `?userId=`, nhưng không bao giờ rộng hơn quyền.

Ba endpoint so sánh giữa các phòng/người dùng **`AggregateReportGuard`**, không dùng
`CompanyReportGuard`: cái sau chỉ cho qua khi người gọi nhìn thấy toàn công ty, nên
trưởng phòng — người đáng lẽ phải xem được hiệu suất phòng mình — sẽ ăn 403. Guard đúng
là "chặn tầng cá nhân", không phải "chỉ cho tầng công ty":

```typescript
@Injectable()
export class AggregateReportGuard implements CanActivate {
  constructor(private readonly scope: ScopeService) {}
  canActivate(ctx: ExecutionContext): boolean {
    const { user } = ctx.switchToHttp().getRequest<RequestWithUser>();
    if (this.scope.reportScope(user).level === 'personal')
      throw new ForbiddenException('Bạn không có quyền xem báo cáo tổng hợp');
    return true;   // company hoặc department đều qua, phạm vi do reportScope lo
  }
}
```

Guard này có DI nên phải dùng `@UseGuards(AggregateReportGuard)` ở controller, không
đăng ký kiểu `new` như các global guard ở §4.

### Hệ thống

| Method | Path | Vai trò | Mô tả |
|---|---|---|---|
| GET | `/health` | `@Public` | Liveness cho reverse proxy |
| GET | `/activity` | `ADMIN` | Audit log, lọc theo entity / người / thời gian |

### Mã lỗi

| HTTP | Khi nào | Ví dụ thông điệp |
|---|---|---|
| 400 | Dữ liệu không hợp lệ | `Giá trị đơn hàng phải lớn hơn 0` |
| 401 | Chưa đăng nhập / token hết hạn | |
| 403 | Sai vai trò, hoặc còn `mustChangePassword` | `Bạn cần đổi mật khẩu trước khi sử dụng hệ thống` |
| 404 | Không tồn tại **hoặc ngoài phạm vi quyền** | `Không tìm thấy đơn hàng` |
| 409 | Xung đột trạng thái | `Không thể chuyển đơn từ "completed" sang "quoting"` |
| 413 | File quá 20MB | |

---

## 16. Prisma & cơ sở dữ liệu

Schema SQL đã có sẵn (`beeops-db/schema.sql`). Hai đường:

- **Khuyến nghị:** chạy `schema.sql` lên DB rỗng rồi `npx prisma db pull` sinh
  `schema.prisma`, sau đó `prisma migrate diff` tạo migration đầu tiên. Giữ SQL làm
  nguồn sự thật cho những thứ Prisma không mô tả được.
- Hoặc viết tay `schema.prisma` rồi migrate — nhưng phải bổ sung SQL thô cho phần thiếu.

**Năm thứ Prisma không sinh được, phải để trong migration SQL thủ công:**

| Thứ | Ghi chú |
|---|---|
| `next_daily_no()`, `order_code()` | Function plpgsql, gọi qua `$queryRaw` |
| Index GIN trên `departments.service_ids` | Prisma không khai báo được GIN |
| Index biểu thức `lower(company_name)` | Tương tự |
| Index một phần `WHERE emailed_at IS NULL` | Tương tự |
| Unique một phần `notifications_dedupe_uk` | Tương tự — và đây là thứ bảo đảm chống nhắc lặp (§18) |

**Ánh xạ kiểu**

| PostgreSQL | Prisma |
|---|---|
| `int[]`, `text[]` | `Int[]`, `String[]` (scalar list) |
| `jsonb` | `Json` |
| `numeric(15,0)` | `Decimal` — **không dùng `Float`** cho tiền |
| `citext` | `String @db.Citext` |
| `timestamptz` | `DateTime @db.Timestamptz(6)` |
| PK ghép `(order_id, department_id)` | `@@id([orderId, departmentId])` |

Ba lưu ý dễ vấp:

- **Tiền phải là `Decimal` trong Prisma, `number` trong DTO.** Lý do dùng `Decimal`
  là `Float` là số dấu phẩy động nhị phân, cộng dồn sẽ sai số — không phải vì tràn
  số nguyên. `numeric(15,0)` tối đa ≈ 1×10¹⁵, còn `Number.MAX_SAFE_INTEGER` ≈ 9×10¹⁵,
  nên số tiền VND **nằm gọn** trong số nguyên an toàn của JavaScript. DTO phơi ra
  `number` (`@IsInt() @Min(1)` như §5), service chuyển bằng `.toNumber()`.
  Không serialize thành `string` — chỉ làm FE phải parse thêm mà không được gì.
- `db pull` sinh tên field snake_case → thêm `@map` để code dùng camelCase.
- `quote_history` là `Json` — Prisma không cập nhật kiểu `||` được, phần đẩy bản giá
  cũ phải `$executeRaw` (§9.1).

---

## 17. Biến môi trường

Mọi biến khai trong Joi schema tại `src/common/config/env.validation.ts` **và**
`.env.example`. Biến không có trong schema là lỗi. Đọc bằng
`configService.getOrThrow<string>()`, không `process.env` rải rác.

```typescript
export const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development','production','test').default('development'),
  PORT: Joi.number().default(8080),

  DATABASE_URL: Joi.string().uri().required(),

  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('12h'),
  COOKIE_SECRET: Joi.string().min(32).required(),
  COOKIE_SECURE: Joi.boolean().default(true),

  FRONTEND_ORIGIN: Joi.string().uri().required(),      // CORS + link trong email

  SMTP_HOST: Joi.string().required(),
  SMTP_PORT: Joi.number().default(587),
  SMTP_USER: Joi.string().required(),
  SMTP_PASS: Joi.string().required(),
  SMTP_FROM: Joi.string().required(),                  // "BeeOps <no-reply@...>"

  UPLOAD_DIR: Joi.string().default('./uploads'),
  MAX_FILE_SIZE_MB: Joi.number().default(20),

  SLA_CHECK_CRON: Joi.string().default('*/15 * * * *'),
  MAIL_FLUSH_CRON: Joi.string().default('*/2 * * * *'),
  QUOTE_EXPIRY_CRON: Joi.string().default('0 * * * *'),
  FILE_CLEANUP_CRON: Joi.string().default('0 3 * * *'),

  // BẮT BUỘC — xem cảnh báo múi giờ ngay bên dưới
  TZ: Joi.string().default('Asia/Ho_Chi_Minh'),
});
```

### Múi giờ — chỗ này sai là hỏng mã đơn

Ba thứ trong hệ thống phụ thuộc múi giờ của **session PostgreSQL**, không phải của
Node:

| Chỗ | Phụ thuộc |
|---|---|
| `next_daily_no()` / `order_code()` | `current_date` |
| `orders.order_day DEFAULT current_date` | `current_date` |
| Dashboard `date_trunc('month', closed_at)` | timezone của session |

Container mặc định chạy **UTC**. Nếu không đặt gì, đơn tạo lúc 00:00–07:00 giờ Việt Nam
sẽ mang mã của **ngày hôm trước** (`DOM-20260821-xxx` cho đơn tạo sáng 22/08), và doanh
thu tháng bị lệch ở đúng ranh giới cuối tháng — hai lỗi rất khó phát hiện vì chúng chỉ
xuất hiện trong 7 giờ mỗi ngày.

Phải đặt ở **cả hai phía**:

```yaml
# docker-compose.yml
db:
  environment: { TZ: Asia/Ho_Chi_Minh, PGTZ: Asia/Ho_Chi_Minh }
api:
  environment: { TZ: Asia/Ho_Chi_Minh }
```

```
# DATABASE_URL — chốt cứng cho mọi connection trong pool
postgresql://…/beeops?options=-c%20timezone%3DAsia%2FHo_Chi_Minh
```

Đặt trong `DATABASE_URL` là chắc chắn nhất: nó áp cho từng connection, không phụ thuộc
biến môi trường của container hay `timezone` mặc định của cluster.

---

## 18. Cron & email

`@nestjs/schedule` chạy trong chính process của app — một instance nên không có chuyện
chạy trùng.

| Cron | Chu kỳ | Việc |
|---|---|---|
| `flushEmails` | 2 phút | Gửi email cho `notifications` có `emailed_at IS NULL` |
| `checkSla` | 15 phút | Đơn `pending` quá `services.sla_hours` → `sla_late` |
| `expireQuotes` | 1 giờ | Báo giá quá `valid_until` → nhắc sale |
| `cleanupOrphanFiles` | 3:00 hằng ngày | File trên đĩa không còn tham chiếu → xóa. **Chỉ xóa file cũ hơn 24 giờ** — file vừa upload xong mà request tạo đơn chưa commit thì chưa có tham chiếu, xóa ngay là mất dữ liệu của người dùng |

`checkSla` phải **chống nhắc lặp** — nếu không thì cứ 15 phút một email cho tới khi có
người nhận đơn. Nhưng chống lặp ở mức `(order_id, type)` là **sai**: một đơn được phân
phối tới nhiều phòng, phòng A trễ trước sẽ khiến phòng B và C không bao giờ được nhắc.

Mức đúng là **`(đơn, phòng, người nhận)`**. Thay vì `NOT EXISTS`, dùng cột
`notifications.dedupe_key` với unique index — để chính database bảo đảm, không phụ
thuộc vào việc hai lần cron có chạy chồng nhau hay không:

```sql
INSERT INTO notifications (user_id, order_id, type, title, body, dedupe_key)
SELECT u.id, o.id, 'sla_late',
       'Đơn ' || o.code || ' quá hạn tiếp nhận',
       'Phòng ' || d.name || ' chưa tiếp nhận sau ' || s.sla_hours || ' giờ.',
       'sla_late:' || o.id || ':' || d.id || ':' || u.id
FROM order_departments od
JOIN orders o      ON o.id = od.order_id
JOIN services s    ON s.id = o.service_id
JOIN departments d ON d.id = od.department_id
-- nhắc cả trưởng phòng lẫn sale phụ trách đơn
JOIN users u ON u.id IN (d.manager_id, o.created_by) AND u.is_active
WHERE od.state = 'pending'
  AND od.distributed_at < now() - (s.sla_hours || ' hours')::interval
ON CONFLICT (dedupe_key) DO NOTHING;
```

Cột này phải có trong `schema.sql`:

```sql
ALTER TABLE notifications ADD COLUMN dedupe_key text;
CREATE UNIQUE INDEX notifications_dedupe_uk ON notifications (dedupe_key)
  WHERE dedupe_key IS NOT NULL;
```

`dedupe_key` để `NULL` cho thông báo thường (mỗi lần là một sự kiện mới); chỉ đặt giá
trị cho loại **lặp lại theo thời gian** — hiện có `sla_late` và `quote_expired`.

**Email** — `MailService` bọc nodemailer, dùng SMTP công ty đã có. Template là hàm
TypeScript trả HTML, không kéo thêm template engine cho 10 loại email:

```typescript
export const templates: Record<NotificationType, (v: TemplateVars) => MailBody> = {
  new_order: (v) => ({
    subject: `[BeeOps] Đơn mới ${v.orderCode} — ${v.serviceName}`,
    html: layout(`<p>Đơn <b>${v.orderCode}</b> vừa được phân phối tới phòng ${v.deptName}.</p>
                  <p><a href="${v.link}">Mở đơn trên BeeOps</a></p>`),
  }),
  // ...
};
```

Email chỉ là **kênh nhắc** — nội dung tối thiểu + link về hệ thống. Nguồn sự thật duy
nhất nằm trên web, đúng tinh thần F8. **Không nhét giá trị đơn hàng vào email**: hộp
thư không tôn trọng phân quyền của mình.

---

## 19. Ghi audit

Mọi thay đổi có ý nghĩa nghiệp vụ đều ghi `activity_log`, **trong cùng transaction**
với thay đổi (khác với thông báo — cái đó ngoài transaction).

```typescript
await this.activity.log(tx, {
  orderId, entity: 'orders', entityId: String(orderId),
  action: 'close', actorId: user.id,
  detail: { finalAmount: [null, amount.toString()], departmentId: [null, deptId] },
});
```

Không dùng Prisma middleware để tự động ghi — nó không biết *ai* thao tác và *vì sao*,
sinh ra log đầy nhưng vô dụng. Ghi tường minh ở chỗ có ngữ cảnh.

Bảng này phục vụ hai việc: audit cho Admin (`GET /activity`) và dòng thời gian đơn
hàng trên trang chi tiết (`GET /orders/:id/timeline`) — phân biệt bằng `order_id` có
hay không.

---

## 20. Hạ tầng & triển khai

Một VM, docker-compose. Đặc tả chốt *"kiến trúc đơn giản, ưu tiên tốc độ triển khai,
dễ bảo trì"*.

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:                           # TZ bắt buộc — xem cảnh báo múi giờ ở §17
      { POSTGRES_DB: beeops, POSTGRES_PASSWORD: ${DB_PASSWORD},
        TZ: Asia/Ho_Chi_Minh, PGTZ: Asia/Ho_Chi_Minh }
    volumes: [pgdata:/var/lib/postgresql/data]
    restart: unless-stopped

  api:
    build: .
    env_file: .env
    environment: { TZ: Asia/Ho_Chi_Minh }
    depends_on: [db]
    volumes: [./uploads:/app/uploads]      # file nằm ngoài image
    restart: unless-stopped

  web:
    image: beeops-frontend:latest
    restart: unless-stopped

  proxy:
    image: caddy:2-alpine                  # HTTPS tự động, cấu hình 5 dòng
    ports: ['80:80', '443:443']
    volumes: [./Caddyfile:/etc/caddy/Caddyfile, caddydata:/data]
    restart: unless-stopped
```

`Dockerfile` multi-stage: build TypeScript → runtime `node:20-alpine` chỉ chứa `dist/`,
`node_modules` production và Prisma client. Chạy bằng user không phải root.

**Backup** (đặc tả yêu cầu backup định kỳ cả dữ liệu lẫn file):

```bash
# cron 2:00 hằng ngày
pg_dump -Fc beeops > /backup/db-$(date +%F).dump
tar czf /backup/uploads-$(date +%F).tgz /srv/beeops/uploads
find /backup -mtime +30 -delete
```

Khôi phục phải thử ít nhất một lần trước golive. Backup chưa từng restore là backup
chưa tồn tại.

**Golive:** không nhập dữ liệu cũ (đặc tả chốt). Chạy `schema.sql` + `seed.sql`, đổi
mật khẩu tài khoản admin đầu tiên, Admin tạo phòng ban / nhân viên / ma trận định
tuyến, rồi mở cho sale tạo đơn mới. Đơn đang chạy hoàn tất theo cách cũ.

---

## 21. Kiểm thử

Mỗi tính năng và mỗi sửa lỗi phải kèm test **trong cùng commit**. Test co-located
`*.spec.ts`, Jest `testRegex: '.*\\.spec\\.ts$'`.

**Bắt buộc có test** — xếp theo mức độ nguy hiểm nếu sai:

| Đơn vị | Vì sao bắt buộc |
|---|---|
| `ScopeService` | Sai → lộ dữ liệu, không ai phát hiện |
| `canSeeOrderAmount` | Sai → lộ doanh thu |
| `assertTransition` | Sai → đơn kẹt trạng thái, phải sửa tay trong DB |
| `OrdersService.create` | Transaction + phân phối; test cả nhánh 0 phòng phụ trách |
| `OrdersService.close` | Khóa doanh thu + snapshot mốc |
| `QuotesService.quote` | `quote_history` và hai cột `*_quoted_at` |
| Đơn giá tham khảo | Thứ tự `match_score` |
| `QuotesService.settleCheck` | Đơn **1 phòng** phải đi thẳng `distributed → awaiting_selection`; đơn mọi phòng `passed` phải bắn `all_passed` và **không** đổi trạng thái |
| `request-revision` từ `awaiting_customer` | `departmentId` về `null`, `won`/`lost` về `quoted`, `passed` giữ nguyên |
| Sinh mã đơn lúc 00:30 giờ VN | Mã phải mang **ngày hôm đó**, không phải hôm trước (§17) |

Bộ ca tối thiểu cho `scope.service.spec.ts`:

| Ca | Kỳ vọng |
|---|---|
| Admin / Ban lãnh đạo | `where` rỗng `{}` |
| Sale | chỉ `createdBy = me` |
| Trưởng phòng | chỉ đơn phòng mình tham gia |
| Nhân viên | đơn mình xử lý **hoặc** hàng đợi phòng |
| Trưởng phòng kiêm sale | `OR` của cả hai — không mất vế nào |
| Vai trò rỗng | `{ id: -1 }`, **không** phải `{}` |
| `departmentId = null` mà có vai trò manager | `{ id: -1 }` |

Và cho `money.visibility.spec.ts`: sale xem đơn của sale khác → `finalAmount` phải là
`null`; nhân viên xem đơn phòng mình xử lý → thấy số.

**Test tính đồng thời của mã đơn** — không unit test được bằng mock, cần integration
test với DB thật:

```typescript
it('20 đơn tạo song song cùng dịch vụ, cùng ngày → 20 mã khác nhau', async () => {
  const codes = await Promise.all(
    Array.from({ length: 20 }, () => service.create(dto, saleUser)),
  );
  expect(new Set(codes.map((c) => c.code)).size).toBe(20);
});
```

Chạy trên PostgreSQL thật (testcontainers hoặc DB `beeops_test` cục bộ). Mock Prisma
không tái hiện được advisory lock — test này mà chạy với mock thì luôn xanh và vô nghĩa.

**Trước khi commit:** `npm run lint` sạch, `npm run format` đã chạy, `npm test` xanh,
`npm run build` pass.

---

## 22. Lộ trình

Bám lộ trình 2 giai đoạn của đặc tả.

**Giai đoạn 1 — MVP.** Mục tiêu: bỏ được email phân phối và file tự quản lý.

| Thứ tự | Việc | Vì sao thứ tự này |
|---|---|---|
| 1 | `common/` — Prisma, guard, interceptor, filter, **ScopeService** | Nền của mọi thứ |
| 2 | `auth` + `departments` + `users` + `services` (F7) | Không có tổ chức thì không định tuyến được |
| 3 | `orders` — tạo đơn + mã đơn (F1) | |
| 4 | `quotes` — phân phối + nhận đơn (F2) | |
| 5 | `quotes` — báo giá + so sánh + đơn giá tham khảo cơ bản (F3) | |
| 6 | `orders` — chốt đơn (F4) | |
| 7 | `milestones` + danh sách/chi tiết (F5) | |
| 8 | `notifications` bản rút gọn (F8) | |
| 9 | `dashboard` rút gọn: doanh thu tháng, số đơn theo trạng thái, win rate | |

**Giai đoạn 2 — mở rộng.** Dashboard đầy đủ các lát cắt + thống kê báo giá cạnh tranh;
đơn giá tham khảo nâng cao (khớp quy mô đa tiêu chí); SLA nâng cao + nhắc tự động;
Kanban kéo-thả; xuất PDF phiếu đơn; audit log chi tiết; `@mention`; chế độ báo giá mở.

Tùy nhu cầu phát sinh: cổng tra cứu trạng thái cho khách hàng; nhận đơn thẳng từ form
báo giá trên `beetransportation.vn` vào F1 — endpoint `@Public` riêng, có rate limit
và captcha. Đây là cửa duy nhất mở ra Internet, đừng dùng chung với API nội bộ.

---

## 23. Checklist review

1. Query `order` nào không `AND` với `scope.orderWhere()`?
2. DTO nào `return { ...order }` thay vì map tường minh từng field?
3. Có chỗ nào gửi email / thông báo **bên trong** `$transaction` không?
4. Tiền có chỗ nào khai `Float` trong Prisma thay vì `Decimal` không? (DTO dùng
   `number` là đúng — xem §16)
5. File có chỗ nào phục vụ tĩnh, bỏ qua kiểm tra scope không?
6. Endpoint mới có `@ApiOperation` + `@ApiResponse` chưa?
7. Biến env mới đã vào Joi schema **và** `.env.example` chưa?
8. Chuyển trạng thái đơn có đi qua `assertTransition` không?
9. Trả 403 ở chỗ đáng lẽ phải 404 (đơn ngoài phạm vi) không?
10. Test cho nhánh phân quyền mới đã viết chưa?
11. `finalAmount` có lọt sang phòng thua không? (chỉ phòng thắng được thấy — §6.4)
12. Cờ `canViewCompanyReport` có mặt ở **cả** `orderWhere` lẫn `reportScope` không?
13. Lọc tầng cá nhân có tính cả `assignee_id`, hay chỉ `created_by`? (§12)
14. Thông báo lặp theo thời gian đã có `dedupe_key` đủ chi tiết chưa? (§18)
15. `rejected` và `cancelled` có bị gộp ở chỗ nào tính win rate không? (§12)
16. Query dùng `current_date` / `date_trunc` có chạy đúng múi giờ VN không? (§17)
17. `SELECT … FOR UPDATE SKIP LOCKED` có nằm trong `$transaction` không? (§11)
18. `request-revision` từ `awaiting_customer` có hoàn tác `departmentId` + `won`/`lost` không? (§9.3)
19. Điều kiện phân quyền có chỗ nào chép tay thay vì gọi `isCompanyWide()` không?
20. `reportScope` có hợp đủ các vế như `orderWhere`, hay dừng ở vai trò khớp đầu tiên? (§6.3)
21. Thao tác đổi trạng thái có ghi `activity_log` **trong** transaction không? (§19)
22. Có chỗ nào gọi `current_date` nhiều lần thay vì lấy một lần rồi truyền đi? (§8.1)
23. Excel / PDF có áp `canSeeOrderAmount` cho từng dòng không, hay chỉ JSON mới lọc? (§6.4)
24. `assertTransition` có chỗ nào viết cứng vế `from` thay vì truyền trạng thái thật? (§10)
25. Có claim quyền nào nhét vào JWT thay vì đọc từ `users` mỗi request không? (§7)
