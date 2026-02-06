using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace Backend.Filters
{
    /// <summary>
    /// Swagger filter to support file upload (IFormFile)
    /// </summary>
    public class FileUploadOperationFilter : IOperationFilter
    {
        public void Apply(OpenApiOperation operation, OperationFilterContext context)
        {
            var fileParams = context.ApiDescription.ParameterDescriptions
                .Where(p => p.ModelMetadata?.ModelType == typeof(IFormFile))
                .ToList();

            if (!fileParams.Any())
                return;

            operation.RequestBody = new OpenApiRequestBody
            {
                Content =
                {
                    ["multipart/form-data"] = new OpenApiMediaType
                    {
                        Schema = new OpenApiSchema
                        {
                            Type = "object",
                            Properties = context.ApiDescription.ParameterDescriptions
                                .ToDictionary(
                                    p => p.Name,
                                    p => p.ModelMetadata?.ModelType == typeof(IFormFile)
                                        ? new OpenApiSchema { Type = "string", Format = "binary" }
                                        : new OpenApiSchema { Type = "string" }
                                ),
                            Required = fileParams.Select(p => p.Name).ToHashSet()
                        }
                    }
                }
            };
        }
    }
}