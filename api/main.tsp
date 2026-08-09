import "@typespec/http";
import "./models.tsp";
import "./routes/event-types.tsp";
import "./routes/bookings.tsp";

using TypeSpec.Http;

/**
 * «Календарь звонков» — сервис бронирования времени на созвоны.
 * Контракт зафиксирован в docs/SPECIFICATION.md (§8); доменная модель — в docs/DOMAIN-MODEL.md.
 */
@service(#{ title: "Calendar API" })
@server("http://localhost:3000", "Локальная разработка")
namespace Calendar;
