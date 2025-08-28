import { ExcelExporter } from './excel-exporter.js';
import { CsvExporter } from './csv-exporter.js';
import { JsonExporter } from './json-exporter.js';
import { ExportUtils } from './export-utils.js';
import { Logger } from '../utils/logger.js';

export class ExportManager {
  constructor() {
    this.logger = new Logger('ExportManager');
    this.excelExporter = new ExcelExporter();
    this.csvExporter = new CsvExporter();
    this.jsonExporter = new JsonExporter();
  }

  async export(posts, profileMetadata, options = {}) {
    try {
      // Validate and clean options
      const validatedOptions = ExportUtils.validateExportOptions(options);
      this.logger.info(`Starting export with format: ${validatedOptions.format}`);

      // Clean data before export
      const cleanPosts = ExportUtils.cleanPostData(posts);
      const cleanProfileMetadata = ExportUtils.cleanProfileMetadata(profileMetadata);

      // Ensure output directory exists
      await ExportUtils.ensureOutputDirectory(validatedOptions.outputDir);

      const results = {};

      switch (validatedOptions.format.toLowerCase()) {
        case 'excel':
          results.excel = await this.excelExporter.exportToExcel(
            cleanPosts, 
            cleanProfileMetadata, 
            validatedOptions.filename
          );
          break;

        case 'csv':
          if (validatedOptions.separateFiles) {
            results.csv = await this.csvExporter.exportMultipleCsvFiles(
              cleanPosts, 
              cleanProfileMetadata, 
              validatedOptions
            );
          } else {
            results.csv = await this.csvExporter.exportToCsv(
              cleanPosts, 
              cleanProfileMetadata, 
              validatedOptions
            );
          }
          break;

        case 'json':
          if (validatedOptions.separateFiles) {
            results.json = await this.jsonExporter.exportSeparateJsonFiles(
              cleanPosts, 
              cleanProfileMetadata, 
              validatedOptions
            );
          } else {
            results.json = await this.jsonExporter.exportToJson(
              cleanPosts, 
              cleanProfileMetadata, 
              validatedOptions
            );
          }
          break;

        case 'all':
          results.excel = await this.excelExporter.exportToExcel(
            cleanPosts, 
            cleanProfileMetadata
          );
          
          if (validatedOptions.separateFiles) {
            results.csv = await this.csvExporter.exportMultipleCsvFiles(
              cleanPosts, 
              cleanProfileMetadata, 
              validatedOptions
            );
            results.json = await this.jsonExporter.exportSeparateJsonFiles(
              cleanPosts, 
              cleanProfileMetadata, 
              validatedOptions
            );
          } else {
            results.csv = await this.csvExporter.exportToCsv(
              cleanPosts, 
              cleanProfileMetadata, 
              validatedOptions
            );
            results.json = await this.jsonExporter.exportToJson(
              cleanPosts, 
              cleanProfileMetadata, 
              validatedOptions
            );
          }
          break;

        default:
          throw new Error(`Unsupported export format: ${validatedOptions.format}`);
      }

      // Create and save export summary
      const summary = ExportUtils.createExportSummary(
        results, 
        cleanPosts, 
        cleanProfileMetadata, 
        validatedOptions
      );
      
      await ExportUtils.saveExportSummary(summary, validatedOptions.outputDir);

      this.logger.info('Export completed successfully');
      return results;

    } catch (error) {
      this.logger.error('Export failed:', error.message);
      throw error;
    }
  }
}