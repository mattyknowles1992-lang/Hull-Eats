import { ArgumentsHost, Catch, ExceptionFilter } from "@nestjs/common";
import { ZodError } from "zod";

function workspaceValidationSummary(issues: ZodError["issues"]): string {
  if (issues.length === 0) {
    return "Some hub settings look invalid. Check the form and try again.";
  }

  const first = issues[0];
  if (!first) {
    return "Some hub settings look invalid. Check the form and try again.";
  }
  const path = first.path.join(".") || "settings";
  const detail = first.message?.trim() || "invalid value";

  if (/heroImageUrl|logoImageUrl/i.test(path)) {
    return detail.includes("too large")
      ? detail
      : "That storefront image could not be saved. Try a smaller photo or a JPG/PNG under 2MB.";
  }

  if (/openingHours|acceptingOrders|delivery|postcode|city|etaMinutes|kitchenTicket|name/i.test(path)) {
    return `Could not save those hub settings (${path}: ${detail}). Check the highlighted fields and try again.`;
  }

  if (issues.length === 1) {
    return `Could not save your changes (${path}: ${detail}).`;
  }

  return `Some hub settings look invalid (${issues.length} fields). Check the form and try again.`;
}

@Catch(ZodError)
export class ZodValidationFilter implements ExceptionFilter<ZodError> {
  catch(exception: ZodError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    const issues = exception.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));

    response.status(400).json({
      statusCode: 400,
      error: "Bad Request",
      message: workspaceValidationSummary(exception.issues),
      summary: workspaceValidationSummary(exception.issues),
      issues,
    });
  }
}
