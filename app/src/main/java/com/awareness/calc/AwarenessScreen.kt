package com.awareness.calc

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

private val AppBg = Color(0xFF101216)
private val CardBg = Color(0xFF1C1F27)
private val AccentTeal = Color(0xFF4CC9F0)
private val OkGreen = Color(0xFF52D273)
private val DenyRed = Color(0xFFFF6B6B)
private val PendingGray = Color(0xFF8A8FA3)
private val TextPrimary = Color(0xFFF5F6FA)
private val TextSecondary = Color(0xFF9AA0B4)

@Composable
fun AwarenessScreen(report: PermReport, onBack: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(AppBg)
            .statusBarsPadding()
            .verticalScroll(rememberScrollState())
            .padding(20.dp)
    ) {
        Text(
            text = "What did you just give me?",
            color = DenyRed,
            fontSize = 26.sp,
            fontWeight = FontWeight.Bold
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = "You opened a simple calculator. The moment it launched, it asked for everything — and you allowed it. Here is what that means:",
            color = TextSecondary,
            fontSize = 15.sp,
            lineHeight = 21.sp
        )

        Spacer(modifier = Modifier.height(20.dp))

        StatusRow("Camera", report.camera, "Photos and video of you, your room, your documents — live, without you noticing")
        StatusRow("Microphone", report.mic, "Audio of every conversation that happens near this phone")
        StatusRow("Precise location", report.location, "Where you live, study, work — your entire daily routine")

        if (report.coords != null) {
            Spacer(modifier = Modifier.height(16.dp))
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(CardBg, RoundedCornerShape(16.dp))
                    .padding(16.dp)
            ) {
                Text("RIGHT NOW I KNOW YOU ARE AT", color = TextSecondary, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(6.dp))
                Text(report.coords ?: "", color = TextPrimary, fontSize = 20.sp, fontWeight = FontWeight.Bold)
                if (report.accuracy != null) {
                    Spacer(modifier = Modifier.height(4.dp))
                    Text("Accuracy: ${report.accuracy}", color = TextSecondary, fontSize = 13.sp)
                }
                if (report.address != null) {
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(report.address, color = AccentTeal, fontSize = 15.sp)
                }
                if (report.locationTime != null) {
                    Spacer(modifier = Modifier.height(4.dp))
                    Text("Captured: ${report.locationTime}", color = TextSecondary, fontSize = 12.sp)
                }
            }
        }

        Spacer(modifier = Modifier.height(20.dp))
        Text(
            text = "Honest note: this demo does NOT record, store or send anything — it all stays on this phone. But a real malicious app would upload your photo, your voice and your location to a server you would never know about.",
            color = TextSecondary,
            fontSize = 14.sp,
            lineHeight = 20.sp
        )
        Spacer(modifier = Modifier.height(12.dp))
        Text(
            text = "Before you tap Allow, ask: why would a calculator need my camera?",
            color = TextPrimary,
            fontSize = 16.sp,
            fontWeight = FontWeight.Bold
        )

        Spacer(modifier = Modifier.height(24.dp))
        Button(
            onClick = onBack,
            modifier = Modifier.fillMaxWidth(),
            colors = ButtonDefaults.buttonColors(containerColor = AccentTeal, contentColor = Color(0xFF0E0F13)),
            shape = RoundedCornerShape(14.dp)
        ) {
            Text("Back to the calculator", fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
        }
        Spacer(modifier = Modifier.height(24.dp))
    }
}

@Composable
private fun StatusRow(title: String, status: PermStatus, consequence: String) {
    val (dotColor, label) = when (status) {
        PermStatus.GRANTED -> OkGreen to "GRANTED"
        PermStatus.DENIED -> DenyRed to "DENIED"
        PermStatus.PENDING -> PendingGray to "NOT ASKED"
    }
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp)
            .background(CardBg, RoundedCornerShape(16.dp))
            .padding(16.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier
                    .size(10.dp)
                    .background(dotColor, CircleShape)
            )
            Spacer(modifier = Modifier.size(10.dp))
            Text(title, color = TextPrimary, fontSize = 18.sp, fontWeight = FontWeight.SemiBold)
            Spacer(modifier = Modifier.weight(1f))
            Text(label, color = dotColor, fontSize = 12.sp, fontWeight = FontWeight.Bold)
        }
        Spacer(modifier = Modifier.height(6.dp))
        Text(consequence, color = TextSecondary, fontSize = 13.sp, lineHeight = 18.sp)
    }
}
