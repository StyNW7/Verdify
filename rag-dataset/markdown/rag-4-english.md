# VERDIFY RAG KNOWLEDGE ARCHITECTURE

## Multi-Layer Retrieval System (Policy + Infrastructure + Data + Intelligence + Real-Time)

---

# 1. SYSTEM OVERVIEW

Verdify uses a multi-layer knowledge architecture to build a Retrieval-Augmented Generation system that is more accurate, contextual, and scalable.

The system is structured into five main layers:

1. Policy Layer
2. Infrastructure Layer
3. Data Layer
4. Intelligence Layer
5. Real-Time Layer

Each layer serves a specific role in supporting reasoning, retrieval, and decision-making.

---

# 2. POLICY LAYER

## Description

The Policy Layer contains strategic documents, regulations, and long-term roadmaps related to low-carbon mobility and sustainability.

## Data Sources

### Low Carbon Mobility Blueprint (LCMB)

* Focuses on emission reduction strategies in the transport sector in Malaysia
* Includes vehicle electrification, energy efficiency, and alternative fuels

### Net Zero 2050 Malaysia

* National target to achieve net-zero carbon emissions by 2050
* Serves as the foundation for sustainability-related decisions

### Johor–Singapore Special Economic Zone (JS-SEZ)

* Cross-border economic development initiative focused on green economy
* Promotes integrated transport and smart mobility systems

## Key Characteristics

* Static or infrequently updated
* Strategic and long-term
* Used for reasoning and justification

## RAG Function

* Provides policy context
* Supports regulation-based explanations
* Enables sustainability-driven recommendations

---

# 3. INFRASTRUCTURE LAYER

## Description

The Infrastructure Layer contains physical transport systems and mobility networks used for movement.

## Data Sources

### RTS Link (Johor–Singapore)

* Cross-border rail system
* Designed to reduce congestion at the Causeway
* High capacity and efficient travel time

### Transport Network

* MRT systems (Singapore)
* Bus systems
* Road networks
* Pedestrian infrastructure

## Key Characteristics

* Semi-static
* Evolves gradually
* Represents real-world mobility structure

## RAG Function

* Provides route options
* Supports multi-modal routing
* Bridges policy with real-world execution

---

# 4. DATA LAYER

## Description

The Data Layer contains quantitative data used for measurement, calculation, and evaluation of emissions and transport conditions.

## Data Sources

### Carbon Monitor

* Global real-time CO2 emission dataset
* Includes transport sector emissions

### Emission Factors

* IPCC emission factors
* DEFRA carbon conversion factors
* Used to calculate emissions per distance or transport mode

### Weather Data (MET Malaysia)

* Includes rainfall, temperature, and humidity
* Influences traffic conditions and fuel efficiency

## Key Characteristics

* Numerical and structured
* Can be static or dynamic
* Used for calculations and metrics

## RAG Function

* Enables emission estimation
* Provides quantitative insights
* Supports data-driven analysis

---

# 5. INTELLIGENCE LAYER

## Description

The Intelligence Layer contains analytical knowledge, behavioral insights, and research findings for higher-level reasoning.

## Data Sources

### Smart Mobility Research

* Studies on AI and IoT applications in transport systems
* Focus on mobility optimization

### Behavioral and Optimization Studies

* Analysis of user transport behavior
* Strategies for encouraging sustainable mobility

## Key Characteristics

* Semi-static
* Insight-driven
* Supports complex reasoning

## RAG Function

* Provides insights and interpretation
* Enables intelligent recommendations
* Connects data with decision-making

---

# 6. REAL-TIME LAYER

## Description

The Real-Time Layer contains frequently updated, time-sensitive data reflecting current conditions.

## Data Sources

* Live traffic data
* Weather updates
* RTS schedule updates
* Transport delays
* Real-time carbon intensity

## Key Characteristics

* Dynamic and frequently updated
* Time-sensitive
* Changes rapidly

## RAG Function

* Provides current context
* Determines real-time relevance
* Drives immediate recommendations

---

# 7. INTER-LAYER RELATIONSHIP

Each layer is interconnected and contributes to the overall system.

## Relationship Mapping

* Policy Layer
  defines goals and constraints

* Infrastructure Layer
  provides implementation pathways

* Data Layer
  supplies measurable metrics

* Intelligence Layer
  transforms data into insights

* Real-Time Layer
  reflects current conditions

---

# 8. RAG RETRIEVAL STRATEGY

## Query Processing Flow

1. User query is received

2. Query is classified into:

   * policy
   * real-time
   * hybrid

3. Retrieval is performed based on layer relevance

---

## Retrieval by Query Type

### Policy Query

* Retrieve from Policy Layer
* Focus on reasoning and explanation

### Real-Time Query

* Retrieve from Real-Time Layer
* Focus on current conditions

### Hybrid Query

* Retrieve from:

  * Policy Layer
  * Infrastructure Layer
  * Data Layer
  * Real-Time Layer

* Merge and rank context

---

## Context Composition

Final context sent to the model includes:

* Real-Time Context
* Infrastructure Context
* Data Context
* Policy Context
* Intelligence Context

---

# 9. EXAMPLE USE CASE

## Query

"Best low emission route from Johor to Singapore right now"

## Retrieval

* Real-Time Layer:

  * Traffic congestion
  * Weather conditions

* Infrastructure Layer:

  * RTS Link availability
  * MRT connectivity

* Data Layer:

  * Emission factors

* Policy Layer:

  * Low carbon mobility strategies

* Intelligence Layer:

  * Multi-modal optimization insights

## Output

A route recommendation based on:

* Lowest emissions
* Current conditions
* Sustainability policies

---

# 10. IMPLEMENTATION NOTES

## Index Structure (Recommended)

Separate indexes in Vertex AI:

* verdify_policy_index
* verdify_infrastructure_index
* verdify_data_index
* verdify_intelligence_index
* verdify_realtime_index

---

## Retrieval Logic

* Use single index for simple queries
* Use multi-index for complex queries
* Apply hybrid merging for final response

---

# 11. FINAL INSIGHT

This approach transforms the system from:

* simple document retrieval

into:

* a multi-layer reasoning system

Resulting in:

* higher accuracy
* better contextual understanding
* stronger real-world relevance