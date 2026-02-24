import { AiCitedFigure } from '@ghostfolio/common/interfaces';

import { Injectable } from '@nestjs/common';

import { VerificationContract } from './interfaces/verification-contract.interface';

@Injectable()
export class VerificationService implements VerificationContract {
  // 0.01% tolerance
  private readonly RELATIVE_TOLERANCE = 0.0001;

  public verify({
    citedFigures,
    factRegistry,
    toolResults
  }: {
    citedFigures: AiCitedFigure[];
    factRegistry: Record<string, number>;
    toolResults: Record<string, unknown>;
  }) {
    const failedCitations: string[] = [];

    for (const citedFigure of citedFigures) {
      const citationIdentifier =
        citedFigure.factId ?? citedFigure.path ?? 'unknown-citation';
      const actualValue = this.getActualValueForCitation({
        citedFigure,
        factRegistry,
        toolResults
      });

      if (typeof actualValue !== 'number' || Number.isNaN(actualValue)) {
        failedCitations.push(citationIdentifier);
        continue;
      }

      const difference = Math.abs(actualValue - citedFigure.value);
      const relativeBase = Math.max(1, Math.abs(actualValue));
      const relativeDifference = difference / relativeBase;

      if (relativeDifference > this.RELATIVE_TOLERANCE) {
        failedCitations.push(citationIdentifier);
      }
    }

    return {
      failedCitations,
      passed: failedCitations.length === 0
    };
  }

  private getActualValueForCitation({
    citedFigure,
    factRegistry,
    toolResults
  }: {
    citedFigure: AiCitedFigure;
    factRegistry: Record<string, number>;
    toolResults: Record<string, unknown>;
  }): unknown {
    if (citedFigure.factId) {
      const factValue = factRegistry[citedFigure.factId];

      if (typeof factValue === 'number' && !Number.isNaN(factValue)) {
        return factValue;
      }
    }

    const candidatePaths = this.getCandidatePaths({
      path: citedFigure.path,
      tool: citedFigure.tool
    });

    let firstDefinedValue: unknown;

    for (const candidatePath of candidatePaths) {
      const value = this.getPathValue({
        root: toolResults,
        path: candidatePath
      });

      if (value !== undefined && firstDefinedValue === undefined) {
        firstDefinedValue = value;
      }

      if (typeof value === 'number' && !Number.isNaN(value)) {
        return value;
      }
    }

    return firstDefinedValue;
  }

  private getCandidatePaths({ path, tool }: { path?: string; tool?: string }) {
    const candidates = new Set<string>();

    if (typeof path === 'string' && path.length > 0) {
      candidates.add(path);
    }

    if (!tool || typeof tool !== 'string') {
      return Array.from(candidates);
    }

    if (path) {
      candidates.add(`${tool}.${path}`);
    }

    candidates.add(tool);

    // Recover from malformed tool fields like "portfolio_analysis.summary.value".
    const [toolRoot, ...toolPathParts] = tool.split('.');

    if (toolRoot && path) {
      candidates.add(`${toolRoot}.${path}`);
    }

    const toolPath = toolPathParts.join('.');

    if (toolRoot && toolPath) {
      candidates.add(`${toolRoot}.${toolPath}`);
    }

    return Array.from(candidates);
  }

  private getPathValue({
    path,
    root
  }: {
    path: string;
    root: Record<string, unknown>;
  }): unknown {
    return path.split('.').reduce<unknown>((currentValue, segment) => {
      if (!currentValue || typeof currentValue !== 'object') {
        return undefined;
      }

      return (currentValue as Record<string, unknown>)[segment];
    }, root);
  }
}
